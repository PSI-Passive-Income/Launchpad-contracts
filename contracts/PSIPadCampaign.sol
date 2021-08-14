// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;
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
    
    address override public factory_address;
    address override public router_address;
    uint256 override public stable_coin_fee;
    uint256 override public campaignTokens;
    uint256 override public feeTokens;

    address override public lp_address;
    uint256 override public unlock_date = 0;

    bool override public finalized = false;
    bool override public locked = false;
    bool override public doRefund = false;

    mapping(address => uint) private participants;

    address override public token;
    uint256 override public softCap;
    uint256 override public hardCap;
    uint256 override public start_date;
    uint256 override public end_date;
    uint256 override public rate;
    uint256 override public min_allowed;
    uint256 override public max_allowed;
    uint256 override public pool_rate;
    uint256 override public lock_duration;
    uint256 override public liquidity_rate;
    
    uint256 override public collected;

    constructor() {
        psipad_factory = msg.sender;
    }

    modifier onlyPSIPadFactory() {
        require(msg.sender == psipad_factory, 'PSIPadCampaign: UNAUTHORIZED');
        _;
    }
    
    /**
     * @notice Initialize a new campaign (can only be triggered by the factory contract)
     */
    function initialize(
        CampaignData calldata _data,
        address _token,
        address _owner,
        address _factory_address,
        address _router_address,
        uint256 _stable_coin_fee,
        uint256 _campaignTokens,
        uint256 _feeTokens
    ) external initializer {
        require(msg.sender == psipad_factory, 'PSIPadCampaign: UNAUTHORIZED');

        super.__Ownable_init();
        transferOwnership(_owner);

        token = _token;
        softCap = _data.softCap;
        hardCap = _data.hardCap;
        start_date = _data.start_date;
        end_date = _data.end_date;
        rate = _data.rate;
        min_allowed = _data.min_allowed;
        max_allowed = _data.max_allowed;
        pool_rate = _data.pool_rate;
        lock_duration = _data.lock_duration;
        liquidity_rate = _data.liquidity_rate;

        factory_address = _factory_address;
        router_address = _router_address;
        stable_coin_fee = _stable_coin_fee;
        campaignTokens = _campaignTokens;
        feeTokens = _feeTokens;

        emit Initialized(_owner);
    }

    /**
     * @notice allows an participant to buy tokens (they can be claimed after the campaign succeeds)
     */
    function buyTokens() external override payable {
        require(isLive(), 'PSIPadCampaign: CAMPAIGN_NOT_LIVE');
        require(msg.value >= min_allowed, 'PSIPadCampaign: BELOW_MIN_AMOUNT');
        require(getGivenAmount(msg.sender).add(msg.value) <= max_allowed, 'PSIPadCampaign: ABOVE_MAX_AMOUNT');
        require((msg.value <= getRemaining()), 'PSIPadCampaign: CONTRACT_INSUFFICIENT_TOKENS');

        collected = (collected).add(msg.value);

        // finalize the campaign when hardcap is reached or minimum deposit is not possible anymore
        if(collected >= hardCap || (hardCap - collected) < min_allowed) finalized = true;
        participants[msg.sender] = participants[msg.sender].add(msg.value);

        emit TokensBought(msg.sender, msg.value);
    }

    /**
     * @notice Add liqudity to an exchange and burn the remaining tokens, 
     * can only be executed when the campaign completes
     */
    function lock() external override onlyPSIPadFactory {
        require(!locked, 'PSIPadCampaign: LIQUIDITY_ALREADY_LOCKED');
        require(block.timestamp >= start_date, 'PSIPadCampaign: CAMPAIGN_NOT_STARTED');
        require(!isLive(), 'PSIPadCampaign: CAMPAIGN_STILL_LIVE');
        require(!failed(), "PSIPadCampaign: CAMPAIGN_FAILED");

        (uint256 tokenFee, uint256 stableFee) = calculateFees();
        addLiquidity(stableFee);

        if (!doRefund) {
            locked = true;
            unlock_date = (block.timestamp).add(lock_duration);

            transferFees(tokenFee, stableFee);

            emit CampaignLocked(collected);
        }
    }
    function calculateFees() internal view returns (uint256 tokenFee, uint256 stableFee) {
        if (feeTokens > 0) {
            uint256 collectedPercentage = (collected.mul(1e18)).div(hardCap);
            tokenFee = (feeTokens.mul(collectedPercentage)).div(1e18);
        }

        if (stable_coin_fee > 0) {
            stableFee = (collected.mul(stable_coin_fee)).div(1e4);
        }
    }
    function transferFees(uint256 tokenFee, uint256 stableFee) internal {
        address fee_aggregator = IPSIPadCampaignFactory(psipad_factory).fee_aggregator();

        if (feeTokens > 0) {
            IERC20Upgradeable(token).safeTransfer(fee_aggregator, tokenFee);
            IFeeAggregator(fee_aggregator).addTokenFee(token, tokenFee);
        }

        if (stable_coin_fee > 0) {
            address stable_coin = IPSIPadCampaignFactory(psipad_factory).stable_coin();
            IWETH(stable_coin).deposit{ value: stableFee }();
            IERC20Upgradeable(stable_coin).safeTransfer(fee_aggregator, stableFee);
            IFeeAggregator(fee_aggregator).addTokenFee(stable_coin, stableFee);
        }
    }
    function addLiquidity(uint256 stableFee) internal {
        lp_address = IPSIPadFactory(factory_address)
            .getPair(token, IPSIPadCampaignFactory(psipad_factory).stable_coin());
        
        if (lp_address == address(0) || IBEP20(lp_address).totalSupply() <= 0) {
            uint256 finalCollected = collected;
            if (liquidity_rate + stable_coin_fee > 10000) finalCollected -= stableFee;
            uint256 stableLiquidity = finalCollected.mul(liquidity_rate).div(10000);

            if (stableLiquidity > 0) {
                uint256 tokenLiquidity = (stableLiquidity.mul(pool_rate)).div(1e18);
                IBEP20(token).approve(router_address, tokenLiquidity);
                IPSIPadRouter(router_address).addLiquidityETH{value : stableLiquidity} (
                    address(token),
                    tokenLiquidity,
                    0,
                    0,
                    address(this),
                    block.timestamp + 1000
                );
                
                if (lp_address == address(0)) {
                    lp_address = IPSIPadFactory(factory_address)
                        .getPair(token, IPSIPadCampaignFactory(psipad_factory).stable_coin());
                    require(lp_address != address(0), "PSIPadCampaign: lp address not set");
                }
            }

            payable(owner()).transfer(collected.sub(stableFee).sub(stableLiquidity));
        } else {
            doRefund = true;
        }
    }
    /**
     * @notice Emergency set lp address when funds are f.e. moved. (only possible when tokens are unlocked)
     */
    function setLPAddress(address _lp_address) external override onlyOwner {
        require(locked && !failed(), 'PSIPadCampaign: LIQUIDITY_NOT_LOCKED');
        require(block.timestamp >= unlock_date, "PSIPadCampaign: TOKENS_ARE_LOCKED");
        lp_address = _lp_address;
    }
    /**
     * @notice allows the owner to unlock the LP tokens and any leftover tokens after the lock has ended
     */
    function unlock() external override onlyPSIPadFactory {
        require(locked && !failed(), 'PSIPadCampaign: LIQUIDITY_NOT_LOCKED');
        require(block.timestamp >= unlock_date, "PSIPadCampaign: TOKENS_ARE_LOCKED");
        IERC20Upgradeable(lp_address).safeTransfer(owner(), IBEP20(lp_address).balanceOf(address(this)));
        IERC20Upgradeable(token).safeTransfer(owner(), IBEP20(token).balanceOf(address(this)));
        emit CampaignUnlocked();
    }

    /**
     * @notice Allow participants to withdraw tokens when campaign succeeds
     */
    function withdrawTokens() external override returns (uint256){
        require(locked, 'PSIPadCampaign: LIQUIDITY_NOT_ADDED');
        require(!failed(), 'PSIPadCampaign: CAMPAIGN_FAILED');
        require(participants[msg.sender] > 0, "PSIPadCampaign: NO_PARTICIPANT");
        uint256 amount = calculateAmount(participants[msg.sender]);
        IERC20Upgradeable(token).safeTransfer(msg.sender, amount);
        participants[msg.sender] = 0;
        return amount;
    }
    /**
     * @notice Allow participants to withdraw funds when campaign fails
     */
    function withdrawFunds() external override {
        require(failed(), "PSIPadCampaign: CAMPAIGN_NOT_FAILED");

        if (msg.sender == owner() && IBEP20(token).balanceOf(address(this)) > 0) {
            IERC20Upgradeable(token).safeTransfer(owner(), IBEP20(token).balanceOf(address(this)));
        }

        if (participants[msg.sender] > 0) {
            uint256 withdrawAmount = participants[msg.sender];
            participants[msg.sender] = 0;
            payable(msg.sender).transfer(withdrawAmount);
        }
    }  

    /**
     * @notice Check whether the campaign is still live
     */
    function isLive() public override view returns(bool) {
        if ((block.timestamp < start_date)) return false;
        if ((block.timestamp >= end_date)) return false;
        if (finalized) return false;
        return true;
    }
    /**
     * @notice Check whether the campaign failed
     */
    function failed() public override view returns(bool){
        return ((block.timestamp >= end_date) && softCap > collected) || doRefund;
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
     * Get an participant's contribution
     */
    function getGivenAmount(address _address) public override view returns (uint256){
        return participants[_address];
    }
}
