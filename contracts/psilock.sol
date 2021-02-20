/**
 *Submitted for verification at Etherscan.io on 2020-10-10
 */

// SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./libraries/SafeMath.sol"
import "./libraries/Address.sol"
import "./interfaces/IDpexV2Router02.sol"
/**s
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
     function balanceOf(address account) external view returns (uint256);

       /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
     function transfer(address recipient, uint256 amount) external returns (bool);

     /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
     function approve(address spender, uint256 amount) external returns (bool);

         /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
     function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

      /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
     event Transfer(address indexed from, address indexed to, uint256 value);

      /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
     event Approval(address indexed owner, address indexed spender, uint256 value);

}


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
contract psiLock {
    using Adress for address;
    using SafeMath for uint;
    address factory;
    uint public locked = 0;
    uint public unlock_date = 0;
    address public owner;
    address public token;
    address public _account;
    address public factory_address;
    uint public softCap;
    uint public hardCap;
    uint public start_date;
    uint public end_date;
    uint public rate;
    uint public min_allowed;
    uint public mad_allowed;
    uint public collected;
    uint public pool_rate;
    uint public lock_duration;
    uint public uniswap_rate;
    uint public rnAMM;

    bool public doRefund = false;
    constructor() public{
        factory = msg.sender;
    }


    modifier onlyOwner(address account) {  
        require(msg.sender == _account);
        _; 
    }

    function setRouterAddress(address _address) public onlyOwner returns (bool) {
        factory_address = _address;
    }

    mapping(address => uint) participant;
    
    // Initialize a new campaign (can only be triggered by the factory contract)
    function initialize(uint[] calldata _data, 
        address _token, 
        address _owner_Address, 
        uint _pool_rate, 
        uint lock_duration, 
        uint _uniswap_rate, 
        uint _rnAMM) external returns (uint) {
            require(msg.sender == factory, 'You are not allowed to initialize a new Campaign');
            owner = owner_Address;
            softCap = _data[0];
            hardCap = _data[1];
            start_date = _data[2];
            end_date = _data[3];
            rate = _data[4];
            min_allowed = _data[5];
            max_allowed = _data[6];
            token = _token;
            pool_rate = _pool_rate;
            lock_duration = _lock_duration;
            uniswap_rate = _uniswap_rate;
            rnAMM = _rnAMM;
    }

    function buyTokens() public payable returns (uint){
        require(isLive(), 'campaign is not live');
        require((msg.value >= min_allowed) && 
            (getGivenAmount(msg.sernder).add(msg.value) <= max_allowed) && 
            (msg.value <= getRemaining()), 'The contract has insufficient funds or you are not allowed');
        participant[msg.sender] = participant[msg.sender].add(msg.value);
        collected = (collected).add(msg.value);
        return 1;
    }
    function withdrawTokens() public returns (uint){
        require(locked == 1, 'liquidity is not yet added');
        require(IERC20(address(token)).transfer(msg.sender.calculateAmount(participant[msg.sender])), "can't transfer");
        participant[msg.sender] = 0;
    }
    function unlock(address _LPT, uint _amount) public returns (bool){
        require(locked == 1 || failed(), 'liquidity is not yet locked');
        require(address(_LPT) != adress(token). 'You are not allowed to withdraw tokens');
        require(block.timestamp >= unlock_date, "can't recieve LP tokens");
        require(msg.sender == owner, 'You are not the owener');
        IERC20(address(_LPT)).transfer(msg.sender,_amount);
    }

    // Add liqudity to uniswap and burn the remaining tokens, can only be executed when the campaign completes

    function psiLOCK() public returns(uint){
        require(locked == 0, 'Liquidity is already locked');
        require(!isLive(), 'Presale is still live');
        require(!failed(), "Presale failed, can't lock liqudity");
        require(softCap <= collected, "Didn't reach soft cap");
        require(addLiquidity(), "error adding liqudity to uniswap");
        locked = 1;
        unlock_date = (block.timestamp).add(lock_duration);
        return 1;
    }

    function addLiquidity() internal returns(bool){
        uint campaign_amount = collected.mul(uint(IPsiLockFactory(factory).fee())).div(1000);
        if(rnAMM == 100) {
            if(IDpexV2Factory(address(factory_address)).getPair(token,address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)) == address(0)){
                IERC20(address(token)).approve(address(IPsiLockFactory(factory).uni_router()),(hardCap.mul(rate)).div(1e18));
                if(uniswap_rate > 0){
                    IDpexV2Router02(address(IPsiLockFactory(factory).uni_router())).addLiquidityETH{value : campaign_amount.mul(uniswap_rate).div(1000))}, ((campaign_amount.mul(uniswap_rate).div(1000)).mul(pool_rate)).div(1e18),0,0,address(this),block.timestamp + 100000000);
                }
                payable(IPsiLockFactory(factory).toFee()).transfer(collected.sub(campaign_amount));
                payable(owner).transfer(campaign_amount.sub(campaign_amount.mul(uniswap_rate).div(1000)));
        } else {
            doRefund = true;
        } else if (rnAMM == 0){
            if(IDpexV2Factory(address(factory_address)).getPair(token,address(0x7242BaA2D0BDe0ccB765C007D9E64fFD46658038)) == address(0)){
                IERC20(address(token)).approve(address(IPsiLockFactory(factory).sushi_router()), (hardCap.mul(rate)).div(1e18));
                if(uniswap_rate > 0){
                    IDpexV2Router02(address(IPsiLockFactory(factory).sushi_router())).addLiquidityETH{value :campaign_amount.mul(uniswap_rate).div(1000)}(address(token), ((campaign_amount.mul(uniswap_rate).div(1000)).mul(pool_rate)).div(1e18),0,0,address(this),block.timestamp + 100000000);
                }
                payable(IPsiLockFactory(factory).toFee()).transfer(collected.sub(campaign_amount));
                payable(owner).transfer(campaign_amount.sub(campaign_amount.mul(uniswap_rate).div(1000)));
            }else{
                doRefund = true;
            }else{
                if(IDpexV2Factory(address(factory_address)).getPair(token, address(0x7242BaA2D0BDe0ccB765C007D9E64fFD46658038)) == address(0) && IDpexV2Factory(address(DPEX_ADDRESS_HERE)).getPair(token,address(DPEX_ADDRESS_HERE)) == address(0)) {
                    IERC20(address(token)).approve(address(IPsiLockFactory(factory).uni_router()),(hardCap.mul(rate)).div(1e18));
                    IERC20(address(token)).approve(address(IPsiLockFactory(factory).sushi_router()),(hardCap.mul(rate).div(1e18));

                    if(uniswap_rate > 0){
                        uint total_liq = campaign_amount.mul(uniswap_rate).div(1000);
                        IDpexV2Router02(address(IPsiLockFactory(factory).uni_router())).addLiquidityETH{value : total_liq.mul(rnAMM).div(100)}(address(token), ((campaign_amount.mul(uniswap_rate).div(1000)).mul(pool_rate)).div(1e18),0,0,address(this), block.timestamp +100000000);
                        IDpexV2Router02(address(IPsiLockFactory(factory).sushi_router())).addLiquidityETH{value : total_liq.mul(uint(100).sub(rnAMM)).div(100)}(address(token), ((campaign_amount.mul(uniswap_rate).div(1000).mul(pool_rate)).div(1e18),0,0,address(this),block.timestamp + 100000000);
                    }
                    payable(IPsiLockFactory(factory).toFee()).transfer(collected.sub(campaign_amount));
                    payable(owner).transfer(campaign_amount.sub(campaign_amount.mul(uniswap_rate).div(1000));
                } else {
                    doRefund = true;
                }
            }

            return true;
        }

        // Check whether the campaign failed

        function failed() public view returns(bool){
            if((block.timestamp >= end_date) && softCap > collected)){
                return true;
            }
            return false;
        }   

        // Allow Participants to withdraw funds when campaign fails
          
        function withdrawFunds() public returns(uint){
            require(failed() || doRefund, "campaign didn't fail");
            require(participant[msg.sender] > 0, "You didn't participate in the campaign");
            uint withdrawAmount = participant[msg.sender].mul(uint(IPsiLockFactory(factory).fee())).div(1000);
            (msg.sender).transfer(withdrawAmount);
            payable(IPsiLockFactory(factory).toFee()).transfer(participant[msg.sender].sub(withdrawAmount));
            participant[msg.sender] = 0;
        }  

        // Check whether the campaign is still live

        function isLive() public view returns(bool){
            if((block.timestamp < start_date)) return false;
            if((block.timestamp >= end_date)) return false;
            if((collected >= hardCap)) return false;
            return true;
        }

        // Returns amount in XYZ
        
        function getRemaining() public view returns (uint){
            return (hardCap).sub(collected);
        }
        function getGivenAmount(address _address) public view returns (uint){
            return participant[_address];
        }

}
