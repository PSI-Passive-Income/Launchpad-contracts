// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import './interfaces/IPSIPadTokenLockFactory.sol';
import "./interfaces/IFeeAggregator.sol";
import "./interfaces/token/IWETH.sol";

contract PSIPadTokenLockFactory is IPSIPadTokenLockFactory, Initializable, OwnableUpgradeable {
    using AddressUpgradeable for address;
    using SafeMath for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public override fee_aggregator;
    address public override stable_coin; // WETH or WBNB
    uint256 public override stable_coin_fee; // fixed amount in bnb

    /**
     * @notice All tokens locked
     */
    LockingData[] public tokensLocked;
    /**
     * @notice Locks mapped on user's wallet address
     */
    mapping(address => uint256[]) public userTokensLocked;

    modifier onlyLockOwner(uint256 lockId) {
        require(tokensLocked.length > lockId, "PSIPadTokenLockFactory: LOCK_DOES_NOT_EXIST");
        require(tokensLocked[lockId].owner == msg.sender, "PSIPadTokenLockFactory: UNAUTHORIZED");
        _;
    }

    /**
     * @notice Initialize a new token lock factory
     */
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

    function setFeeAggregator(address _fee_aggregator) external override onlyOwner {
        fee_aggregator = _fee_aggregator;
    }
    function setStableCoin(address _stable_coin) external override onlyOwner {
        stable_coin = _stable_coin;
    }
    function setStableCoinFee(uint256 _stable_coin_fee) external override onlyOwner {
        stable_coin_fee = _stable_coin_fee;
    }

    function getUserLocks(address user) external override view returns(uint256[] memory) {
        return userTokensLocked[user];
    }

    function lock(address token, uint256 amount, uint256 start_time, uint256 duration, uint256 releases) 
        external override payable returns(uint256) 
    {
        require(amount > 0, "PSIPadTokenLockFactory: AMOUNT_ZERO");
        require(msg.value >= stable_coin_fee, "PSIPadTokenLockFactory: FEE_NOT_PAYED");
        require(releases > 0, "PSIPadTokenLockFactory: NO_RELEASES");

        transferFees(msg.value);

        uint256 balance = IERC20Upgradeable(token).balanceOf(address(this));
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
        amount = IERC20Upgradeable(token).balanceOf(address(this)).sub(balance);
        require(amount > 0, "PSIPadTokenLockFactory: AMOUNT_ZERO_AFTER_TRANSFER");

        tokensLocked.push(LockingData(msg.sender, token, amount, start_time, duration, releases, 0));
        userTokensLocked[msg.sender].push(tokensLocked.length - 1);

        emit TokenLocked(tokensLocked.length - 1, token, msg.sender, amount);

        return tokensLocked.length - 1;
    }
    function transferFees(uint256 fee) internal {
        if (fee > 0) {
            IWETH(stable_coin).deposit{ value: fee }();
            IERC20Upgradeable(stable_coin).safeTransfer(fee_aggregator, fee);
            IFeeAggregator(fee_aggregator).addTokenFee(stable_coin, fee);
        }
    }
    function changeOwner(uint256 lockId, address newOwner) external override onlyLockOwner(lockId) {
        tokensLocked[lockId].owner = newOwner;
        userTokensLocked[newOwner].push(lockId);
        bool lockFound = false;
        for (uint256 idx = 0; idx < userTokensLocked[msg.sender].length; idx++) {
            if (lockFound || userTokensLocked[msg.sender][idx] == lockId) {
                if (idx < userTokensLocked[msg.sender].length - 1) {
                    userTokensLocked[msg.sender][idx] = userTokensLocked[msg.sender][idx + 1];
                }
                lockFound = true;
            }
        }
        
        require(lockFound, "PSIPadTokenLockFactory: OLD_OWNER_NOT_FOUND");
        userTokensLocked[msg.sender].pop();
        emit OwnerChanged(lockId, msg.sender, newOwner);
    }

    function unlock(uint256 lockId, uint256 amount) external override onlyLockOwner(lockId) {
        uint256 amountAvailable = amountToUnlock(lockId);
        require(amountAvailable >= amount, "PSIPadTokenLockFactory: AMOUNT_TO_HIGH_OR_LOCKED");
        _unlock(lockId, amount);
    }
    function unlockAvailable(uint256 lockId) external override onlyLockOwner(lockId) {
        uint256 amountAvailable = amountToUnlock(lockId);
        require(amountAvailable > 0, "PSIPadTokenLockFactory: NO_AMOUNT_AVAILABLE");
        _unlock(lockId, amountAvailable);
    }
    function _unlock(uint256 lockId, uint256 amount) internal {
        tokensLocked[lockId].amountUnlocked += amount;
        IERC20Upgradeable(tokensLocked[lockId].token).safeTransfer(tokensLocked[lockId].owner, amount);
        emit TokenUnlocked(lockId, tokensLocked[lockId].token, amount);
    }
    function amountToUnlock(uint256 lockId) public override view returns (uint256) {
        uint256 amount = unlockedAmount(lockId);
        if (amount > 0) return amount.sub(tokensLocked[lockId].amountUnlocked);
        return 0;
    }
    function unlockedAmount(uint256 lockId) public override view returns (uint256) {
        if (tokensLocked[lockId].amount == 0 || block.timestamp <= tokensLocked[lockId].start_time) return 0;

        for(uint256 times = tokensLocked[lockId].releases; times >= 1; times--) {
            if (block.timestamp >= tokensLocked[lockId].start_time.add(
                (tokensLocked[lockId].duration.div(tokensLocked[lockId].releases)).mul(times))) {
                return (tokensLocked[lockId].amount.div(tokensLocked[lockId].releases)).mul(times);
            }
        }
        return 0;
    }
}