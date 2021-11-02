// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './BaseToken.sol';
import './extensions/crosschain/AnyswapV4ERC20.sol';

contract TokenAnySwap is BaseToken, AnyswapV4ERC20 {
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool burnable,
        bool mintable,
        uint256 minterDelay,
        address underlying,
        address vault
    ) public virtual initializer {
        __BaseToken_init(name, symbol, initialSupply, maxSupply, burnable, mintable, minterDelay);
        __AnyswapV4ERC20_init_unchained(underlying, vault);
    }

    //== Mandatory overrides ==/
    function _mint(address account, uint256 amount) internal virtual override(BaseToken, ERC20Upgradeable) {
        super._mint(account, amount);
    }
}
