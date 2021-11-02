// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import './IAnyswapV4ERC20.sol';
import '../../extensions/ERC20Burnable.sol';
import '../../extensions/ERC20Mintable.sol';
import '../../ERC2612/ERC2612.sol';

contract AnyswapV4ERC20 is
    Initializable,
    ContextUpgradeable,
    OwnableUpgradeable,
    IAnyswapV4ERC20,
    ERC20Upgradeable,
    ERC20Mintable,
    ERC2612
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint8 private _decimals = 18;
    address public override underlying;

    // flag to enable/disable swapout vs vault.burn so multiple events are triggered
    bool private _vaultOnly;

    // primary controller of the token contract
    address public override vault;
    address public override pendingVault;
    uint256 public override delayVault;

    function __AnyswapV4ERC20_init(
        string memory name,
        string memory symbol,
        bool mintable,
        uint256 minterDelay,
        address _underlying,
        address _vault
    ) internal initializer {
        super.__Ownable_init_unchained();
        super.__ERC20_init(name, symbol);
        super.__ERC20Mintable_init_unchained(mintable, minterDelay);
        super.__ERC2612_init_unchained(name);
        __AnyswapV4ERC20_init_unchained(_underlying, _vault);
    }

    function __AnyswapV4ERC20_init_unchained(address _underlying, address _vault) internal initializer {
        underlying = _underlying;

        if (_underlying != address(0x0)) {
            _decimals = ERC20Upgradeable(_underlying).decimals();
        }

        // Disable/Enable swapout for v1 tokens vs mint/burn for v3 tokens
        _vaultOnly = false;

        if (_vault != address(0)) {
            vault = _vault;
            _addMinter(_vault);
        }
    }

    modifier onlyVault() {
        require(_msgSender() == mpc(), 'AnyswapV3ERC20: FORBIDDEN');
        _;
    }

    modifier onlyOwnerOrVault() {
        require(_msgSender() == mpc() || _msgSender() == owner(), 'AnyswapV3ERC20: FORBIDDEN');
        _;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mpc() public view virtual override returns (address) {
        return vault;
    }

    function setVaultOnly(bool enabled) external virtual override onlyOwnerOrVault {
        _vaultOnly = enabled;
    }

    function changeVault(address newVault) public virtual override onlyOwnerOrVault {
        require(newVault != address(0), 'AnyswapV3ERC20: address(0x0)');
        pendingVault = newVault;
        delayVault = block.timestamp + minterDelay;
        emit LogChangeVault(vault, pendingVault, delayVault);
    }

    function applyVault() external virtual override onlyOwnerOrVault {
        require(block.timestamp >= delayVault);
        if (vault != address(0)) _removeMinter(vault);
        vault = pendingVault;
        pendingVault = address(0);
        delayVault = 0;
        _addMinter(pendingVault);
    }

    function revokeVault() external virtual override onlyOwnerOrVault {
        vault = address(0);
        pendingVault = address(0);
        delayVault = 0;
    }

    function changeMPCOwner(address newVault) external virtual override onlyOwnerOrVault {
        changeVault(newVault);
    }

    function burn(address from, uint256 amount) external virtual override onlyMinter returns (bool) {
        require(from != address(0), 'AnyswapV3ERC20: address(0x0)');
        _burn(from, amount);
        return true;
    }

    function Swapin(
        bytes32 txhash,
        address account,
        uint256 amount
    ) public virtual override onlyMinter returns (bool) {
        _mint(account, amount);
        emit LogSwapin(txhash, account, amount);
        return true;
    }

    function Swapout(uint256 amount, address bindaddr) public virtual override returns (bool) {
        require(!_vaultOnly, 'AnyswapV4ERC20: onlyMinter');
        require(bindaddr != address(0), 'AnyswapV3ERC20: address(0x0)');
        _burn(_msgSender(), amount);
        emit LogSwapout(_msgSender(), bindaddr, amount);
        return true;
    }

    function depositWithPermit(
        address target,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address to
    ) external virtual override returns (uint256) {
        ERC2612(underlying).permit(target, address(this), value, deadline, v, r, s);
        IERC20Upgradeable(underlying).safeTransferFrom(target, address(this), value);
        return _deposit(value, to);
    }

    function depositWithTransferPermit(
        address target,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address to
    ) external virtual override returns (uint256) {
        ERC2612(underlying).transferWithPermit(target, address(this), value, deadline, v, r, s);
        return _deposit(value, to);
    }

    function deposit() external virtual override returns (uint256) {
        uint256 _amount = IERC20Upgradeable(underlying).balanceOf(_msgSender());
        IERC20Upgradeable(underlying).safeTransferFrom(_msgSender(), address(this), _amount);
        return _deposit(_amount, _msgSender());
    }

    function deposit(uint256 amount) external virtual override returns (uint256) {
        IERC20Upgradeable(underlying).safeTransferFrom(_msgSender(), address(this), amount);
        return _deposit(amount, _msgSender());
    }

    function deposit(uint256 amount, address to) external virtual override returns (uint256) {
        IERC20Upgradeable(underlying).safeTransferFrom(_msgSender(), address(this), amount);
        return _deposit(amount, to);
    }

    function depositVault(uint256 amount, address to) external virtual override onlyVault returns (uint256) {
        return _deposit(amount, to);
    }

    function _deposit(uint256 amount, address to) internal returns (uint256) {
        require(underlying != address(0x0) && underlying != address(this));
        _mint(to, amount);
        return amount;
    }

    function withdraw() external virtual override returns (uint256) {
        return _withdraw(_msgSender(), balanceOf(_msgSender()), _msgSender());
    }

    function withdraw(uint256 amount) external virtual override returns (uint256) {
        return _withdraw(_msgSender(), amount, _msgSender());
    }

    function withdraw(uint256 amount, address to) external virtual override returns (uint256) {
        return _withdraw(_msgSender(), amount, to);
    }

    function withdrawVault(
        address from,
        uint256 amount,
        address to
    ) external virtual override onlyVault returns (uint256) {
        return _withdraw(from, amount, to);
    }

    function _withdraw(
        address from,
        uint256 amount,
        address to
    ) internal returns (uint256) {
        _burn(from, amount);
        IERC20Upgradeable(underlying).safeTransfer(to, amount);
        return amount;
    }
}
