// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import './interfaces/IPSIPadTokenDeployer.sol';
import './interfaces/IFeeAggregator.sol';
import './interfaces/token/IWETH.sol';
import './token/interfaces/IToken.sol';
import './token/interfaces/ITokenAnySwap.sol';

contract PSIPadTokenDeployer is IPSIPadTokenDeployer, Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public override fee_aggregator;
    address public override stable_coin; // WETH or WBNB
    uint256 public override stable_coin_fee; // fixed amount in bnb

    mapping(TokenType => address) public override tokenTypes;
    address[] public override tokens;
    mapping(address => address[]) public userTokens;

    function initialize(
        address _fee_aggregator,
        address _stable_coin,
        uint256 _stable_coin_fee
    ) external initializer {
        super.__Ownable_init();
        fee_aggregator = _fee_aggregator;
        stable_coin = _stable_coin;
        stable_coin_fee = _stable_coin_fee;
    }

    function getUserTokens(address creator) external view override returns (address[] memory) {
        return userTokens[creator];
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

    function setTokenType(TokenType tokenType, address implementation) external override onlyOwner {
        tokenTypes[tokenType] = implementation;
    }

    function createToken(TokenData calldata tokenData) external payable override returns (address token_address) {
        require(msg.value >= stable_coin_fee, 'PSIPadTokenDeployer: FEE_NOT_PAYED');

        transferFees(msg.value);

        token_address = _createToken(tokenData);

        IERC20Upgradeable(token_address).transfer(
            _msgSender(),
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        tokens.push(token_address);
        userTokens[_msgSender()].push(token_address);
        return token_address;
    }

    function transferFees(uint256 fee) internal {
        if (fee > 0) {
            IWETH(stable_coin).deposit{value: fee}();
            IERC20Upgradeable(stable_coin).safeTransfer(fee_aggregator, fee);
            IFeeAggregator(fee_aggregator).addTokenFee(stable_coin, fee);
        }
    }

    function _createToken(TokenData calldata tokenData) internal returns (address token_address) {
        bytes32 salt = keccak256(abi.encodePacked(tokenData.name, _msgSender()));
        if (tokenData.crossChain) {
            token_address = ClonesUpgradeable.cloneDeterministic(tokenTypes[TokenType.BaseAnySwap], salt);
            ITokenAnySwap(token_address).initialize(
                tokenData.name,
                tokenData.symbol,
                tokenData.initialSupply,
                tokenData.maximumSupply,
                tokenData.burnable,
                tokenData.mintable,
                tokenData.minterDelay,
                tokenData.underlying,
                tokenData.vault
            );
        } else {
            token_address = ClonesUpgradeable.cloneDeterministic(tokenTypes[TokenType.Base], salt);
            IToken(token_address).initialize(
                tokenData.name,
                tokenData.symbol,
                tokenData.initialSupply,
                tokenData.maximumSupply,
                tokenData.burnable,
                tokenData.mintable,
                tokenData.minterDelay
            );
        }

        emit TokenCreated(_msgSender(), token_address, tokenData.name, tokenData.symbol, tokenData.initialSupply);
        return token_address;
    }
}
