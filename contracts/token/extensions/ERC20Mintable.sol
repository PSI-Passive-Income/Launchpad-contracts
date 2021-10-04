// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import './IERC20Mintable.sol';

/**
 * @dev Extension of {ERC20} that allows minters to mint new tokens
 */
abstract contract ERC20Mintable is
    Initializable,
    ContextUpgradeable,
    OwnableUpgradeable,
    IERC20Mintable,
    ERC20Upgradeable
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bool public override mintable;
    uint256 public override minterDelay = 0;
    EnumerableSetUpgradeable.AddressSet internal _minters;
    mapping(address => uint256) public override minterPending;

    modifier onlyMinter() {
        require(isMinter(_msgSender()), 'ERC20Mintable: ONLY_MINTER_ALLOWED');
        _;
    }
    modifier isMintable() {
        require(mintable, 'ERC20Mintable: TOKEN_NOT_MINTABLE');
        _;
    }

    function __ERC20Mintable_init_unchained(bool _mintable, uint256 _minterDelay) internal initializer {
        mintable = _mintable;
        if (mintable) {
            _minters.add(_msgSender());
            minterDelay = _minterDelay;
        }
    }

    function addMinter(address minter) external virtual override onlyOwner {
        require(!isMinter(minter), 'ERC20Mintable: ALREADY_MINTER');
        if (minterDelay > 0) {
            require(minterPending[minter] == 0, 'ERC20Mintable: MINTER_ALREADY_PENDING');
            minterPending[minter] = block.timestamp + minterDelay;
        } else {
            _addMinter(minter);
        }
    }

    function removeMinter(address minter) public virtual override onlyOwner {
        _removeMinter(minter);
    }

    function applyMinter(address minter) external virtual override onlyOwner {
        require(
            minterPending[minter] > 0 && minterPending[minter] <= block.timestamp,
            'ERC20Mintable: MINTER_STILL_PENDING'
        );
        _addMinter(minter);
    }

    function isMinter(address minter) public view virtual override returns (bool) {
        return _minters.contains(minter);
    }

    function _addMinter(address minter) internal virtual {
        _minters.add(minter);
        minterPending[minter] = 0;
    }

    function _removeMinter(address minter) internal virtual {
        _minters.remove(minter);
        minterPending[minter] = 0;
    }

    function minters() external view virtual override returns (address[] memory) {
        address[] memory mintersArray;
        for (uint256 idx = 0; idx < _minters.length(); idx++) {
            mintersArray[idx] = _minters.at(idx);
        }
        return mintersArray;
    }

    /**
     * @dev Creates `amount` tokens and assigns them to `account`, increasing the total supply.
     */
    function mint(address account, uint256 amount) external virtual override isMintable onlyMinter {
        _mint(account, amount);
    }
}
