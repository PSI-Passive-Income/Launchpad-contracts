// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';

/**
 * @dev Based on @openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol
 */
abstract contract ERC20Capped is ERC20Upgradeable {
    uint256 public cap;

    /**
     * @dev Sets the value of the `cap`. This value is immutable, it can only be
     * set once during construction.
     */
    function __ERC20Capped_init_unchained(uint256 _cap) internal initializer {
        cap = _cap;
    }

    /**
     * @dev See {ERC20-_mint}.
     */
    function _mint(address account, uint256 amount) internal virtual override {
        if (cap > 0) require(ERC20Upgradeable.totalSupply() + amount <= cap, 'ERC20Capped: cap exceeded');
        super._mint(account, amount);
    }
}
