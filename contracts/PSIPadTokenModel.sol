// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./interfaces/token/IBEP20.sol";
import "./abstracts/token/crosschain/AnyswapV4ERC20.sol";

contract PSIPadTokenModel is ContextUpgradeable, IBEP20, AnyswapV4ERC20 {
    address public deployer;

    constructor () {
        deployer = msg.sender;
    }

    function initialize(
        string memory tokenName,
        string memory tokenSymbols,
        uint256 tokenTotalSupply
    ) external initializer {
        require(msg.sender == deployer, 'You are not allowed');
        super.__AnyswapV4ERC20_init(tokenName, tokenSymbols, 18, address(0), address(0));
        _mint(_msgSender(), tokenTotalSupply);
    }

    //== BEP20 owner function ==
    function getOwner() public override view returns (address) {
        return owner();
    }
}