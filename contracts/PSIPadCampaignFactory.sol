// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import './PSIPadCampaign.sol';
import './interfaces/IFeeAggregator.sol';
import './interfaces/IPSIPadCampaignFactory.sol';

contract PSIPadCampaignFactory is IPSIPadCampaignFactory, Initializable, OwnableUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public override default_factory;
    address public override default_router;
    address public override fee_aggregator;

    address public override stable_coin; // WETH or WBNB
    uint256 public override stable_coin_fee; // out of 10000
    uint256 public override token_fee; // out of 10000

    /**
     * @notice all campaigns
     */
    address[] public campaigns;

    /**
     * @notice campaign ID's for a user
     */
    mapping(address => uint256[]) public userCampaigns;

    address public override cloneAddress;

    mapping(address => bool) public allowedContracts;

    modifier isOwner(uint256 campaignId) {
        require(campaigns.length > campaignId, 'PSIPadCampaignFactory: CAMPAIGN_DOES_NOT_EXIST');
        require(PSIPadCampaign(campaigns[campaignId]).owner() == msg.sender, 'PSIPadCampaignFactory: UNAUTHORIZED');
        _;
    }

    function initialize(
        address _default_factory,
        address _default_router,
        address _fee_aggregator,
        address _stable_coin,
        uint256 _stable_coin_fee,
        uint256 _token_fee,
        address _cloneAddress
    ) external initializer {
        super.__Ownable_init();
        default_factory = _default_factory;
        default_router = _default_router;
        fee_aggregator = _fee_aggregator;
        stable_coin = _stable_coin;
        stable_coin_fee = _stable_coin_fee;
        token_fee = _token_fee;
        cloneAddress = _cloneAddress;

        allowedContracts[_default_factory] = true;
        allowedContracts[_default_router] = true;
    }

    function setDefaultFactory(address _default_factory) external override onlyOwner {
        default_factory = _default_factory;
    }

    function setDefaultRouter(address _default_router) external override onlyOwner {
        default_router = _default_router;
    }

    function setFeeAggregator(address _fee_aggregator) external override onlyOwner {
        fee_aggregator = _fee_aggregator;
    }

    function setStableCoin(address _stable_coin) external override onlyOwner {
        stable_coin = _stable_coin;
    }

    function setStableCoinFee(uint256 _stable_coin_fee) external override onlyOwner {
        stable_coin_fee = _stable_coin_fee;
    }

    function setTokenFee(uint256 _token_fee) external override onlyOwner {
        token_fee = _token_fee;
    }

    function setCloneAddress(address _cloneAddress) external override onlyOwner {
        cloneAddress = _cloneAddress;
    }

    function setAllowedContracts(address[] calldata _allowedContracts, bool allowed) external override onlyOwner {
        for(uint256 idx = 0; idx < _allowedContracts.length; idx++) {
            allowedContracts[_allowedContracts[idx]] = allowed;
        }
    }

    function getUserCampaigns(address user) external view override returns (uint256[] memory) {
        return userCampaigns[user];
    }

    /**
     * @notice Start a new campaign using
     * @dev 1 ETH = 1 XYZ (pool_rate = 1e18) <=> 1 ETH = 10 XYZ (pool_rate = 1e19) <=> XYZ (decimals = 18)
     */
    function createCampaign(
        IPSIPadCampaign.CampaignData calldata _data,
        address _token,
        uint256 _tokenFeePercentage,
        address _factory,
        address _router
    ) external override returns (address campaign_address) {
        return createCampaignWithOwner(_data, msg.sender, _token, _tokenFeePercentage, _factory, _router);
    }

    function createCampaignWithOwner(
        IPSIPadCampaign.CampaignData calldata _data,
        address _owner,
        address _token,
        uint256 _tokenFeePercentage,
        address _factory,
        address _router
    ) public override returns (address campaign_address) {
        require(_data.softCap < _data.hardCap, 'PSIPadLockFactory: SOFTCAP_HIGHER_THEN_HARDCAP');
        require(_data.start_date < _data.end_date, 'PSIPadLockFactory: STARTDATE_HIGHER_THEN_ENDDATE');
        require(block.timestamp < _data.end_date, 'PSIPadLockFactory: ENDDATE_HIGHER_THEN_CURRENTDATE');
        require(_data.min_allowed < _data.hardCap, 'PSIPadLockFactory: MINIMUM_ALLOWED_HIGHER_THEN_HARDCAP');
        require(_data.rate != 0, 'PSIPadLockFactory: RATE_IS_ZERO');
        require(
            _data.liquidity_rate >= 0 && _data.liquidity_rate <= 10000,
            'PSIPadLockFactory: LIQUIDITY_RATE_0_10000'
        );
        require(allowedContracts[_factory], "PSIPadLockFactory: FACTORY_NOT_ALLOWED");
        require(allowedContracts[_router], "PSIPadLockFactory: ROUTER_NOT_ALLOWED");

        if (token_fee > 0 && !IFeeAggregator(fee_aggregator).isFeeToken(_token))
            IFeeAggregator(fee_aggregator).addFeeToken(_token);

        campaign_address = ClonesUpgradeable.clone(cloneAddress);

        (uint256 campaignTokens, uint256 feeTokens) = calculateTokens(_data);
        PSIPadCampaign(campaign_address).initialize(
            _data,
            _token,
            _owner,
            _factory,
            _router,
            stable_coin_fee,
            campaignTokens,
            feeTokens
        );

        campaigns.push(campaign_address);
        userCampaigns[_owner].push(campaigns.length - 1);

        transferToCampaign(_data, _token, campaign_address, _tokenFeePercentage);

        require(
            IERC20Upgradeable(_token).balanceOf(campaign_address) >= campaignTokens.add(feeTokens),
            'PSIPadLockFactory: CAMPAIGN_TOKEN_AMOUNT_TO_LOW'
        );

        emit CampaignAdded(campaign_address, _token, _owner);

        return campaign_address;
    }

    function transferToCampaign(
        IPSIPadCampaign.CampaignData calldata _data,
        address _token,
        address _campaign_address,
        uint256 _tokenFeePercentage
    ) internal {
        uint256 tokenAmount = tokensNeeded(_data, _tokenFeePercentage);
        IERC20Upgradeable(_token).safeTransferFrom(msg.sender, _campaign_address, tokenAmount);
    }

    /**
     * @notice calculates how many tokens are needed to start an campaign
     */
    function tokensNeeded(IPSIPadCampaign.CampaignData calldata _data, uint256 _tokenFeePercentage)
        public
        view
        override
        returns (uint256)
    {
        (uint256 campaignTokens, uint256 feeTokens) = calculateTokens(_data);
        uint256 totalTokens = campaignTokens.add(feeTokens);
        // add the token fee transfer percentage if there is any
        return totalTokens.add((totalTokens.mul(_tokenFeePercentage)).div(1e4));
    }

    function calculateTokens(IPSIPadCampaign.CampaignData calldata _data)
        internal
        view
        returns (uint256 campaignTokens, uint256 feeTokens)
    {
        campaignTokens = (_data.hardCap.mul(_data.rate).div(1e18)).add(
            (_data.hardCap.mul(_data.liquidity_rate)).mul(_data.pool_rate).div(1e22)
        ); // pool rate 10000 x 1e18

        feeTokens = (campaignTokens.mul(token_fee)).div(1e4);
    }

    /**
     * @notice Add liqudity to an exchange and burn the remaining tokens,
     * can only be executed when the campaign completes
     */
    function lock(uint256 campaignId) external override isOwner(campaignId) {
        address campaign = campaigns[campaignId];
        PSIPadCampaign(campaign).lock();
        emit CampaignLocked(campaign, PSIPadCampaign(campaign).token(), PSIPadCampaign(campaign).collected());
    }

    /**
     * @notice allows the owner to unlock the LP tokens and any leftover tokens after the lock has ended
     */
    function unlock(uint256 campaignId) external override isOwner(campaignId) {
        address campaign = campaigns[campaignId];
        PSIPadCampaign(campaign).unlock();
        emit CampaignUnlocked(campaign, PSIPadCampaign(campaign).token());
    }

    function emergencyRefund(uint256 campaignId) external onlyOwner override {
        address campaign = campaigns[campaignId];
        PSIPadCampaign(campaign).emergencyRefund();
    }
}
