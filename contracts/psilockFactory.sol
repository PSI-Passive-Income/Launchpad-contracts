// SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import './psilock.sol';
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

contract psiLockFactory {
    using Address for address;
    using SafeMath for uint;
    address[] public campaigns;
    address public toFee;
    uint public fee;
    address factory_owner;
    address public psi_address;
    address public dpex_router;
    address public sushi_router;

    uint balance_required;

    constructor(address _PSI,uint min_balance,uint _fee,address _uniRouter,address _sushiRouter) public {
        factory_owner = msg.sender;
        toFee = msg.sender;
        psi_address = _PSI;
        balance_required = min_balance;
        fee = _fee;
        dpex_router = _uniRouter;
        sushi_router = _sushiRouter;
    }
    modifier only_factory_Owner() {
        require(factory_owner == msg.sender, 'You are not the owner');
        _;
    }

    //   1 ETH = 1 XYZ (_pool_rate = 1e18) <=> 1 ETH = 10 XYZ (_pool_rate = 1e19) <=> XYZ (decimals = 18)
   // _data = _softCap,_hardCap,_start_date, _end_date,_rate,_min_allowed,_max_allowed

    function createCampaign(uint[] memory _data,address _token,uint _pool_rate,uint _lock_duration,uint _uniswap_rate,uint _rnAMM) public returns (address campaign_address){
        require(IERC20(address(psi_address)).balanceOf(msg.sender) >= uint(balance_required),"You don't have the minimum UNL tokens required to launch a campaign");
        require(_data[0] < _data[1],"Error :  soft cap can't be higher than hard cap" );
        require(_data[2] < _data[3] ,"Error :  start date can't be higher than end date " );
        require(block.timestamp < _data[3] ,"Error :  end date can't be higher than current date ");
        require(_data[5] < _data[1],"Error :  minimum allowed can't be higher than hard cap " );
        require(_data[4] != 0,"rate can't be null");
        require(_uniswap_rate >= 0 && _uniswap_rate <= 1000);
        bytes memory bytecode = type(psiLock).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, msg.sender));
        assembly {
                campaign_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        psiLock(campaign_address).initilaize(_data,_token,msg.sender,_pool_rate,_lock_duration,_uniswap_rate,_rnAMM);
        campaigns.push(campaign_address);
        require(transferToCampaign(_data[1],_data[4],_pool_rate,_token,campaign_address,_uniswap_rate),"unable to transfer funds");
        return campaign_address;
    }
    function transferToCampaign(uint _data1, uint _data4, uint _pool_rate,address _token,address _campaign_address, uint _uniswap_rate) internal returns(bool) {
        require(ApproveTransferTo((_data1.mul(_data4).div(1e18)),_uniswap_rate,_data1,_token,_campaign_address,_pool_rate));
        return true;
    }
    function ApproveTransferTo(uint _data,uint _uniswap_rate, uint _data1, address _token,address _campaign_address,uint _pool_rate) internal returns(bool){
        require(IERC20(address(_token)).transferFrom(msg.sender,address(_campaign_address),_data.add((_data1.mul(_uniswap_rate)).mul(_pool_rate).div(1e21))), "unable to transfer token amount to the campaign");
        return true;
    }

    function changeConfig(uint _fee,address _to,uint _balance_required,address _uni_router,address _psi_address,address _sushi_router) public only_factory_Owner returns(uint){
        fee = _fee;
        toFee = _to;
        balance_required = _balance_required;
        dpex_router = _uni_router;
        psi_address = _psi_address;
        sushi_router = _sushi_router;
    }
}