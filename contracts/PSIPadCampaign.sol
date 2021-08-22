// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;
pragma abicoder v2;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import './interfaces/IPSIPadCampaign.sol';
import './interfaces/IPSIPadCampaignFactory.sol';
import './interfaces/IFeeAggregator.sol';
import './interfaces/token/IBEP20.sol';
import './interfaces/token/IWETH.sol';
import './interfaces/exchange/IPSIPadFactory.sol';
import './interfaces/exchange/IPSIPadRouter.sol';

contract PSIPadCampaign is IPSIPadCampaign, Initializable, OwnableUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public override psipad_factory;

    address public override factory_address;
    address public override router_address;
    uint256 public override stable_coin_fee;
    uint256 public override campaignTokens;
    uint256 public override feeTokens;

    address public override lp_address;
    uint256 public override unlock_date = 0;

    bool public override finalized = false;
    bool public override locked = false;
    bool public override doRefund = false;

    mapping(address => uint256) private participants;

    address public override token;
    uint256 public override softCap;
    uint256 public override hardCap;
    uint256 public override start_date;
    uint256 public override end_date;
    uint256 public override rate;
    uint256 public override min_allowed;
    uint256 public override max_allowed;
    uint256 public override pool_rate;
    uint256 public override lock_duration;
    uint256 public override liquidity_rate;

    uint256 public override collected;

    constructor() {
        psipad_factory = _msgSender();
    }

    modifier onlyPSIPadFactory() {
        require(_msgSender() == psipad_factory, 'PSIPadCampaign: UNAUTHORIZED');
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
        // _msgSender() = address(0) when using Clone.
        require(psipad_factory == address(0) || _msgSender() == psipad_factory, 'UNAUTHORIZED');

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
        
        psipad_factory = _msgSender();
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
    function buyTokens() external payable override {
        require(isLive(), 'PSIPadCampaign: CAMPAIGN_NOT_LIVE');
        require(msg.value >= min_allowed, 'PSIPadCampaign: BELOW_MIN_AMOUNT');
        require(getGivenAmount(_msgSender()).add(msg.value) <= max_allowed, 'PSIPadCampaign: ABOVE_MAX_AMOUNT');
        require((msg.value <= getRemaining()), 'PSIPadCampaign: CONTRACT_INSUFFICIENT_TOKENS');

        collected = (collected).add(msg.value);

        // finalize the campaign when hardcap is reached or minimum deposit is not possible anymore
        if (collected >= hardCap || (hardCap - collected) < min_allowed) finalized = true;
        participants[_msgSender()] = participants[_msgSender()].add(msg.value);

        emit TokensBought(_msgSender(), msg.value);
    }

    /**
     * @notice Add liqudity to an exchange and burn the remaining tokens,
     * can only be executed when the campaign completes
     */
    function lock() external override onlyPSIPadFactory {
        require(!locked, 'PSIPadCampaign: LIQUIDITY_ALREADY_LOCKED');
        require(block.timestamp >= start_date, 'PSIPadCampaign: CAMPAIGN_NOT_STARTED');
        require(!isLive(), 'PSIPadCampaign: CAMPAIGN_STILL_LIVE');
        require(!failed(), 'PSIPadCampaign: CAMPAIGN_FAILED');

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
            IWETH(stable_coin).deposit{value: stableFee}();
            IERC20Upgradeable(stable_coin).safeTransfer(fee_aggregator, stableFee);
            IFeeAggregator(fee_aggregator).addTokenFee(stable_coin, stableFee);
        }
    }

    function addLiquidity(uint256 stableFee) internal {
        lp_address = IPSIPadFactory(factory_address).getPair(
            token,
            IPSIPadCampaignFactory(psipad_factory).stable_coin()
        );

        if (lp_address == address(0) || IBEP20(lp_address).totalSupply() <= 0) {
            uint256 finalCollected = collected;
            if (liquidity_rate + stable_coin_fee > 10000) finalCollected -= stableFee;
            uint256 stableLiquidity = finalCollected.mul(liquidity_rate).div(10000);

            if (stableLiquidity > 0) {
                uint256 tokenLiquidity = (stableLiquidity.mul(pool_rate)).div(1e18);
                IBEP20(token).approve(router_address, tokenLiquidity);
                IPSIPadRouter(router_address).addLiquidityETH{value: stableLiquidity}(
                    address(token),
                    tokenLiquidity,
                    0,
                    0,
                    address(this),
                    block.timestamp + 1000
                );

                if (lp_address == address(0)) {
                    lp_address = IPSIPadFactory(factory_address).getPair(
                        token,
                        IPSIPadCampaignFactory(psipad_factory).stable_coin()
                    );
                    require(lp_address != address(0), 'PSIPadCampaign: lp address not set');
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
        require(block.timestamp >= unlock_date, 'PSIPadCampaign: TOKENS_ARE_LOCKED');
        lp_address = _lp_address;
    }

    /**
     * @notice allows the owner to unlock the LP tokens and any leftover tokens after the lock has ended
     */
    function unlock() external override onlyPSIPadFactory {
        require(locked && !failed(), 'PSIPadCampaign: LIQUIDITY_NOT_LOCKED');
        require(block.timestamp >= unlock_date, 'PSIPadCampaign: TOKENS_ARE_LOCKED');
        IERC20Upgradeable(lp_address).safeTransfer(owner(), IBEP20(lp_address).balanceOf(address(this)));
        IERC20Upgradeable(token).safeTransfer(owner(), IBEP20(token).balanceOf(address(this)));
        emit CampaignUnlocked();
    }

    /**
     * @notice Allow participants to withdraw tokens when campaign succeeds
     */
    function withdrawTokens() external override returns (uint256) {
        require(locked, 'PSIPadCampaign: LIQUIDITY_NOT_ADDED');
        require(!failed(), 'PSIPadCampaign: CAMPAIGN_FAILED');
        require(participants[_msgSender()] > 0, 'PSIPadCampaign: NO_PARTICIPANT');
        uint256 amount = calculateAmount(participants[_msgSender()]);
        IERC20Upgradeable(token).safeTransfer(_msgSender(), amount);
        participants[_msgSender()] = 0;
        return amount;
    }

    /**
     * @notice Allow participants to withdraw funds when campaign fails
     */
    function withdrawFunds() external override {
        require(failed(), 'PSIPadCampaign: CAMPAIGN_NOT_FAILED');

        if (_msgSender() == owner() && IBEP20(token).balanceOf(address(this)) > 0) {
            IERC20Upgradeable(token).safeTransfer(owner(), IBEP20(token).balanceOf(address(this)));
        }

        if (participants[_msgSender()] > 0) {
            uint256 withdrawAmount = participants[_msgSender()];
            participants[_msgSender()] = 0;
            payable(_msgSender()).transfer(withdrawAmount);
        }
    }

    /**
     * @notice Check whether the campaign is still live
     */
    function isLive() public view override returns (bool) {
        if ((block.timestamp < start_date)) return false;
        if ((block.timestamp >= end_date)) return false;
        if (finalized) return false;
        return true;
    }

    /**
     * @notice Check whether the campaign failed
     */
    function failed() public view override returns (bool) {
        return ((block.timestamp >= end_date) && softCap > collected) || doRefund;
    }

    /**
     * @notice Returns amount in XYZ
     */
    function calculateAmount(uint256 _amount) public view override returns (uint256) {
        return (_amount.mul(rate)).div(1e18);
    }

    /**
     * @notice Get remaining tokens not sold
     */
    function getRemaining() public view override returns (uint256) {
        return (hardCap).sub(collected);
    }

    /**
     * Get an participant's contribution
     */
    function getGivenAmount(address _address) public view override returns (uint256) {
        return participants[_address];
    }
}
