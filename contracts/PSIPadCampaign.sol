// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./interfaces/IPSIPadCampaign.sol";
import "./interfaces/IPSIPadCampaignFactory.sol";
import "./interfaces/IFeeAggregator.sol";
import "./interfaces/token/IBEP20.sol";
import "./interfaces/token/IWETH.sol";
import "./interfaces/exchange/IPSIPadFactory.sol";
import "./interfaces/exchange/IPSIPadRouter.sol";

contract PSIPadCampaign is IPSIPadCampaign, Initializable, OwnableUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address override public immutable psipad_factory;

    address override public token;
    uint256 override public softCap;
    uint256 override public hardCap;
    uint256 override public start_date;
    uint256 override public end_date;
    uint256 override public rate;
    uint256 override public min_allowed;
    uint256 override public max_allowed;
    uint256 override public collected;
    uint256 override public pool_rate;
    uint256 override public lock_duration;
    uint256 override public liquidity_rate;

    address override public factory_address;
    address override public router_address;
    uint256 override public stable_coin_fee = 100; // out of 10000, default 1%
    uint256 override public token_fee = 50; // out of 10000, default 0.5%

    address override public lp_address;
    uint256 override public locked = 0;
    uint256 override public unlock_date = 0;

    bool override public finalized = false;
    bool override public doRefund = false;

    mapping(address => uint) private participant;

    constructor() {
        psipad_factory = msg.sender;
    }
    
    /**
     * @notice Initialize a new campaign (can only be triggered by the factory contract)
     */
    function initialize(
        uint256[] calldata _data,
        address _token,
        address _owner,
        uint256 _pool_rate,
        uint256 _lock_duration,
        uint256 _liquidity_rate,
        address _factory_address,
        address _router_address,
        uint256 _stable_coin_fee,
        uint256 _token_fee
    ) external initializer {
        require(msg.sender == psipad_factory, 'PSIPadCampaign: UNAUTHORIZED');

        super.__Ownable_init();
        transferOwnership(_owner);

        softCap = _data[0];
        hardCap = _data[1];
        start_date = _data[2];
        end_date = _data[3];
        rate = _data[4];
        min_allowed = _data[5];
        max_allowed = _data[6];
        token = _token;
        pool_rate = _pool_rate;
        lock_duration = _lock_duration;
        liquidity_rate = _liquidity_rate;

        factory_address = _factory_address;
        router_address = _router_address;
        stable_coin_fee = _stable_coin_fee;
        token_fee = _token_fee;
    }

    /**
     * @notice allows an participant to buy tokens (they can be claimed after the campaign succeeds)
     */
    function buyTokens() external override payable {
        require(isLive(), 'PSIPadCampaign: CAMPAIGN_NOT_LIVE');
        require(msg.value >= min_allowed, 'PSIPadCampaign: BELOW_MIN_AMOUNT');
        require(getGivenAmount(msg.sender).add(msg.value) <= max_allowed, 'PSIPadCampaign: ABOVE_MAX_AMOUNT');
        require((msg.value <= getRemaining()), 'PSIPadCampaign: CONTRACT_INSUFFICIENT_FUNDS');

        participant[msg.sender] = participant[msg.sender].add(msg.value);
        collected = (collected).add(msg.value);

        if(collected >= hardCap) {
            finalized = true;
        }
    }
    /**
     * @notice Emergency finalize the campaign when not triggered on buy. 
     * (only possible when minimum deposit is not possible anymore)
     */
    function emergencyFinalize() external override onlyOwner {
        require((hardCap - collected) < min_allowed, "PSIPadCampaign: MIN_DEPOSIT_STILL_AVAILABLE");
        finalized = true;
    }

    /**
     * @notice Add liqudity to an exchange and burn the remaining tokens, 
     * can only be executed when the campaign completes
     */
    function lock() external override {
        require(locked == 0, 'PSIPadCampaign: LIQUIDITY_ALREADY_LOCKED');
        require(!isLive(), 'PSIPadCampaign: PRESALE_STILL_LIVE');
        require(!failed(), "PSIPadCampaign: PRESALE_FAILED");
        require(softCap <= collected, "PSIPadCampaign: SOFT_CAP_NOT_REACHED");
        require(finalized, "PSIPadCampaign: NOT_FINALIZED");

        transferFees();
        addLiquidity();
        locked = 1;
        unlock_date = (block.timestamp).add(lock_duration);
    }
    function transferFees() internal {
        address fee_aggregator = IPSIPadCampaignFactory(psipad_factory).fee_aggregator();

        if (token_fee > 0) {
            uint256 collectedPercentage = (collected.mul(1e18)).div(hardCap);
            uint256 tokensToSend = IERC20Upgradeable(token).balanceOf(address(this));
            tokensToSend = (collectedPercentage.mul(tokensToSend)).div(1e18);
            tokensToSend = (tokensToSend.mul(token_fee)).div(1e5);

            IBEP20(token).transfer(fee_aggregator, tokensToSend);
            IFeeAggregator(fee_aggregator).addFeeToken(token);
            IFeeAggregator(fee_aggregator).addTokenFee(token, tokensToSend);
        }

        if (stable_coin_fee > 0) {
            uint256 stableToSend = (collected.mul(stable_coin_fee)).div(1e5);
            address stable_coin = IPSIPadCampaignFactory(psipad_factory).stable_coin();
            IWETH(stable_coin).deposit{ value: stableToSend }();
            IWETH(stable_coin).transfer(fee_aggregator, stableToSend);
            IFeeAggregator(fee_aggregator).addTokenFee(stable_coin, stableToSend);
        }
    }
    function addLiquidity() internal {
        if (IPSIPadFactory(factory_address)
            .getPair(token, IPSIPadCampaignFactory(psipad_factory).stable_coin()) == address(0)) {
            if (liquidity_rate > 0) {
                uint256 tokenLiquidity = ((collected.mul(liquidity_rate).div(10000)).mul(pool_rate)).div(1e18);
                IBEP20(token).approve(router_address, tokenLiquidity);
                IPSIPadRouter(router_address).addLiquidityETH{value : collected.mul(liquidity_rate).div(10000)} (
                    address(token),
                    tokenLiquidity,
                    0,
                    0,
                    address(this),
                    block.timestamp + 1000
                );
                
                lp_address = IPSIPadFactory(factory_address)
                    .getPair(token, IPSIPadCampaignFactory(psipad_factory).stable_coin());
            }

            payable(owner()).transfer(collected.sub(collected.mul(liquidity_rate).div(10000)));

        } else {
            doRefund = true;
        }
    }
    /**
     * @notice allows the owner to unlock the LP tokens and any leftover tokens after the lock has ended
     */
    function unlock() external override onlyOwner {
        require(locked == 1 || failed(), 'PSIPadCampaign: LIQUIDITY_NOT_LOCKED');
        require(block.timestamp >= unlock_date, "PSIPadCampaign: TOKENS_ARE_LOCKED");
        IBEP20(lp_address).transfer(msg.sender, IBEP20(lp_address).balanceOf(address(this)));
        IBEP20(token).transfer(msg.sender, IBEP20(token).balanceOf(address(this)));
    }

    /**
     * @notice Allow participants to withdraw tokens when campaign succeeds
     */
    function withdrawTokens() external override returns (uint256){
        require(locked == 1, 'PSIPadCampaign: LIQUIDITY_NOT_ADDED');
        uint256 amount = calculateAmount(participant[msg.sender]);
        require(IBEP20(address(token)).transfer(msg.sender, amount),"can't transfer");
        participant[msg.sender] = 0;
        return amount;
    }
    /**
     * @notice Allow participants to withdraw funds when campaign fails
     */
    function withdrawFunds() external override {
        require(failed() || doRefund, "PSIPadCampaign: CAMPAIGN_NOT_FAILED");
        require(participant[msg.sender] > 0, "PSIPadCampaign: NO_PARTICIPANT");
        uint256 withdrawAmount = participant[msg.sender];
        participant[msg.sender] = 0;
        payable(msg.sender).transfer(withdrawAmount);
    }  

    /**
     * @notice Check whether the campaign is still live
     */
    function isLive() public override view returns(bool){
        if((block.timestamp < start_date)) return false;
        if((block.timestamp >= end_date)) return false;
        if((collected >= hardCap)) return false;
        return true;
    }
    /**
     * @notice Check whether the campaign failed
     */
    function failed() public override view returns(bool){
        return ((block.timestamp >= end_date) && softCap > collected);
    }

    /**
     * @notice Returns amount in XYZ
     */
    function calculateAmount(uint256 _amount) public override view returns(uint256){
        return (_amount.mul(rate)).div(1e18);
    }
    /**
     * @notice Get remaining tokens not sold
     */
    function getRemaining() public override view returns (uint256){
        return (hardCap).sub(collected);
    }
    /**
     * Get an participants contribution
     */
    function getGivenAmount(address _address) public override view returns (uint256){
        return participant[_address];
    }
}
