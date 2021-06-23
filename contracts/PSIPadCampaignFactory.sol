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

    address public override stable_coin; // WETH or WBNB
    uint256 public override stable_coin_fee; // out of 10000
    uint256 public override token_fee; // out of 10000
    
    address[] public campaigns;

    function initialize(
        address _default_factory,
        address _default_router,
        address _fee_aggregator,
        address _stable_coin,
        uint256 _stable_coin_fee,
        uint256 _token_fee
    ) external initializer {
        super.__Ownable_init();
        default_factory = _default_factory;
        default_router = _default_router;
        fee_aggregator = _fee_aggregator;
        stable_coin = _stable_coin;
        stable_coin_fee = _stable_coin_fee;
        token_fee = _token_fee;
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
     */
    function createCampaign(
        IPSIPadCampaign.CampaignData calldata _data,
        address _token,
        uint256 _tokenFeePercentage
    ) external override returns (address campaign_address) {
        require(_data.softCap < _data.hardCap, "PSIPadLockFactory: SOFTCAP_HIGHER_THEN_LOWCAP" );
        require(_data.start_date < _data.end_date, "PSIPadLockFactory: STARTDATE_HIGHER_THEN_ENDDATE" );
        require(block.timestamp < _data.end_date, "PSIPadLockFactory: ENDDATE_HIGHER_THEN_CURRENTDATE");
        require(_data.min_allowed < _data.hardCap, "PSIPadLockFactory: MINIMUM_ALLOWED_HIGHER_THEN_HARDCAP" );
        require(_data.rate != 0, "PSIPadLockFactory: RATE_IS_ZERO");
        require(_data.liquidity_rate >= 0 && _data.liquidity_rate <= 10000);
        
        bytes memory bytecode = type(PSIPadCampaign).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, msg.sender));
        assembly {
            campaign_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        PSIPadCampaign(campaign_address).initialize(
            _data,
            _token,
            msg.sender,
            default_factory,
            default_router,
            stable_coin_fee,
            token_fee
        );

        campaigns.push(campaign_address);
        transferToCampaign(
            _data,
            _token,
            campaign_address,
            _tokenFeePercentage
        );

        require(
            IERC20Upgradeable(_token).balanceOf(campaign_address) >= tokensNeeded(_data, _tokenFeePercentage), 
            "PSIPadLockFactory: CAMPAIGN_TOKEN_AMOUNT_TO_LOW"
        );
        
        return campaign_address;
    }
    function transferToCampaign(
        IPSIPadCampaign.CampaignData calldata _data,
        address _token,
        address _campaign_address,
        uint256 _tokenFeePercentage
    ) internal {
        uint256 tokenAmount = 
            (_data.hardCap.mul(_data.rate).div(1e18)).add(
                (_data.hardCap.mul(_data.liquidity_rate))
                    .mul(_data.pool_rate).div(1e22)); // pool rate 10000 x 1e18

        tokenAmount += (tokenAmount.mul(_tokenFeePercentage)).div(1e5);
        IERC20Upgradeable(_token).safeTransferFrom(msg.sender, _campaign_address, tokenAmount);
    }

    function tokensNeeded(
        IPSIPadCampaign.CampaignData calldata _data,
        uint256 _tokenFeePercentage
    ) public override view returns (uint256 _tokensNeeded) {
        _tokensNeeded = 
            (_data.hardCap.mul(_data.rate).div(1e18)).add(
                (_data.hardCap.mul(_data.liquidity_rate))
                    .mul(_data.pool_rate).div(1e22)); // pool rate 10000 x 1e18

        // add the token fee percentage if there is any
        _tokensNeeded += (_tokensNeeded.mul(_tokenFeePercentage)).div(1e5);
    }
}