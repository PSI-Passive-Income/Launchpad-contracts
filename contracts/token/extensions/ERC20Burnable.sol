// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';

/**
 * @dev Based on @openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol
 */
abstract contract ERC20Burnable is Initializable, ContextUpgradeable, ERC20Upgradeable {
    bool public burnable;

    function __ERC20Burnable_init_unchained(bool _burnable) internal initializer {
        burnable = _burnable;
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     */
    function burn(uint256 amount) public virtual {
        require(burnable, 'TOKEN_NOT_BURNABLE');
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address account, uint256 amount) public virtual {
        require(burnable, 'TOKEN_NOT_BURNABLE');
        uint256 currentAllowance = allowance(account, _msgSender());
        require(currentAllowance >= amount, 'ERC20: burn amount exceeds allowance');
        _approve(account, _msgSender(), currentAllowance - amount);
        _burn(account, amount);
    }
}
