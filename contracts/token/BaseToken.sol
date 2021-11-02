// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '../interfaces/token/IBEP20.sol';
import './extensions/ERC20TokenRecover.sol';
import './extensions/ERC20Capped.sol';
import './extensions/ERC20Burnable.sol';
import './extensions/ERC20Mintable.sol';
import './ERC1363/ERC1363.sol';
import './ERC2612/ERC2612.sol';

abstract contract BaseToken is
    Initializable,
    ContextUpgradeable,
    OwnableUpgradeable,
    IBEP20,
    ERC20Upgradeable,
    ERC20TokenRecover,
    ERC20Capped,
    ERC20Burnable,
    ERC20Mintable,
    ERC1363,
    ERC2612
{
    address public deployer;

    constructor() {
        deployer = _msgSender();
    }

    function __BaseToken_init(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool burnable,
        bool mintable,
        uint256 minterDelay
    ) public virtual initializer {
        // msg.sender = address(0) when using Clone.
        require(deployer == address(0) || _msgSender() == deployer, 'UNAUTHORIZED');
        deployer = _msgSender();

        super.__ERC20_init(name, symbol);
        super.__Ownable_init_unchained();
        super.__ERC20Capped_init_unchained(maxSupply);
        super.__ERC20Burnable_init_unchained(burnable);
        super.__ERC20Mintable_init_unchained(mintable, minterDelay);
        super.__ERC2612_init_unchained(name);

        _mint(_msgSender(), initialSupply);
    }

    //== BEP20 owner function ==
    function getOwner() public view override returns (address) {
        return owner();
    }

    //== Mandatory overrides ==/
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1363, ERC2612) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _mint(address account, uint256 amount) internal virtual override(ERC20Capped, ERC20Upgradeable) {
        super._mint(account, amount);
    }
}
