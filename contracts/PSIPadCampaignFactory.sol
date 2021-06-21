// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import './PSIPadCampaign.sol';
import "./interfaces/IPSIPadCampaign.sol";
import './interfaces/IPSIPadCampaignFactory.sol';

contract PSIPadCampaignFactory is IPSIPadCampaignFactory, Initializable, OwnableUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public override default_factory;
    address public override default_router;
    address public override fee_aggregator;

    address override public stable_coin = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // default WETH
    uint256 override public stable_coin_fee = 100; // out of 10000, default 1%
    uint256 override public token_fee = 50; // out of 10000, default 0.5%
    
    address[] public campaigns;

    function initialize(address _default_factory, address _default_router, address _stable_coin) external initializer {
        super.__Ownable_init();
        default_factory = _default_factory;
        default_router = _default_router;
        stable_coin = _stable_coin;
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

    /**
     * @notice Start a new campaign using
     * @dev 1 ETH = 1 XYZ (_pool_rate = 1e18) <=> 1 ETH = 10 XYZ (_pool_rate = 1e19) <=> XYZ (decimals = 18)
     * _data = _softCap, _hardCap, _start_date, _end_date, _rate, _min_allowed, _max_allowed
     */
    function createCampaign(
        uint256[] memory _data,
        address _token,
        uint256 _pool_rate,
        uint256 _lock_duration,
        uint256 _liquidity_rate,
        uint256 _tokenFeePercentage
    ) external override returns (address campaign_address) {
        require(_data[0] < _data[1], "PSIPadLockFactory: SOFTCAP_HIGHER_THEN_LOWCAP" );
        require(_data[2] < _data[3], "PSIPadLockFactory: STARTDATE_HIGHER_THEN_ENDDATE" );
        require(block.timestamp < _data[3], "PSIPadLockFactory: ENDDATE_HIGHER_THEN_CURRENTDATE");
        require(_data[5] < _data[1], "PSIPadLockFactory: MINIMUM_ALLOWED_HIGHER_THEN_HARDCAP" );
        require(_data[4] != 0, "PSIPadLockFactory: RATE_IS_ZERO");
        require(_liquidity_rate >= 0 && _liquidity_rate <= 1000);
        
        bytes memory bytecode = type(PSIPadCampaign).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, msg.sender));
        assembly {
            campaign_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        PSIPadCampaign(campaign_address).initialize(
            _data,
            _token,
            msg.sender,
            _pool_rate,
            _lock_duration,
            _liquidity_rate,
            default_factory,
            default_router,
            stable_coin_fee,
            token_fee
        );

        campaigns.push(campaign_address);
        transferToCampaign(
            _data[1],
            _data[4],
            _pool_rate,
            _token,
            campaign_address,
            _liquidity_rate,
            _tokenFeePercentage
        );

        require(
            IERC20Upgradeable(_token).balanceOf(address(campaign_address)) >= 
                tokensNeeded(_data, _pool_rate, _liquidity_rate, _tokenFeePercentage), 
            "PSIPadLockFactory: CAMPAIGN_TOKEN_AMOUNT_TO_LOW"
        );
        
        return campaign_address;
    }
    function transferToCampaign(
        uint256 _hardCap,
        uint256 _rate,
        uint256 _pool_rate,
        address _token,
        address _campaign_address,
        uint256 _liquidity_rate,
        uint256 _tokenFeePercentage
    ) internal {
        uint256 tokenAmount = 
            (_hardCap.mul(_rate).div(1e18)).add(
                (_hardCap.mul(_liquidity_rate))
                    .mul(_pool_rate).div(1e21)); // pool rate 1000 x 1e18

        tokenAmount += (tokenAmount.mul(_tokenFeePercentage)).div(1e5);
        IERC20Upgradeable(_token).safeTransferFrom(
            msg.sender,
            address(_campaign_address),
            tokenAmount
        );
    }

    function tokensNeeded(
        uint256[] memory _data,
        uint256 _pool_rate,
        uint256 _liquidity_rate,
        uint256 _tokenFeePercentage
    ) public override view returns (uint256 _tokensNeeded) {
        _tokensNeeded = 
            (_data[1].mul(_data[4]).div(1e18)).add(
                (_data[1].mul(_liquidity_rate))
                    .mul(_pool_rate).div(1e22)); // pool rate 10000 x 1e18

        // add the psi token fee
        _tokensNeeded += (_tokensNeeded.mul(token_fee)).div(1e5);
        // add the token fee percentage if there is any
        _tokensNeeded += (_tokensNeeded.mul(_tokenFeePercentage)).div(1e5);
    }
}