pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import './tokenLock.sol';
/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */

/**
 * @dev Collection of functions related to the address type
 */

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */


/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20PresetMinterPauser}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin guidelines: functions revert instead
 * of returning `false` on failure. This behavior is nonetheless conventional
 * and does not conflict with the expectations of ERC20 applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract tokenLockFactory {
    using Address for address;
    using SafeMath for uint;
    address factory_owner;
    address public unl_address;
    uint balance_required;
    mapping (address => address) totalLockedTokens;

    constructor(address _UNL, uint min_balance) public {
        factory_owner = msg.sender;
        unl_address = _UNL;
        balance_required = min_balance;

    }
    modifier only_factory_Owner(){
        require(factory_owner == msg.sender, 'You are not the owner');
        _;
    }

    function lockTokens(tokenLock.locking_Data[] memory _data,address _token) public returns (address tokenLock_address){
        require(IERC20(address(unl_address)).balanceOf(msg.sender) >= uint(balance_required), "You don't have the minimum UNL tokens required to launch a campaign");
        bytes memory bytecode = type(tokenLock).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, msg.sender, block.timestamp));
        assembly {
            tokenLock_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        uint totalAmount = 0;
        tokenLock(tokenLock_address).initialize(_data,_token,msg.sender);
        for (uint i = 0; i < _data.length; i++){
            totalAmount += _data[i].amount;
        }
        require(totalAmount > 0, 'right amount');
        require(IERC20(address(_token)).transferFrom(msg.sender,address(tokenLock_address), totalAmount), 'cannot transfer tokens');
        totalLockedTokens[_token] = tokenLock_address;
        return tokenLock_address;
    }

    function changeConfig(uint _fee,address _to, uint _balance_required,address _uni_router,address _unl_address) public only_factory_Owner returns(uint){
        balance_required = _balance_required;
        unl_address = _unl_address;
    }
    function isTokenLocked(address _token) public view returns(address){
        return totalLockedTokens[_token];
    }

}
