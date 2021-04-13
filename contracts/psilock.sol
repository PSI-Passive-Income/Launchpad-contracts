// SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@passive-income/dpex-swap-core/contracts/interfaces/IDPexFactory.sol";
import "@passive-income/dpex-peripheral/contracts/interfaces/IDPexRouter.sol";
import "./interfaces/IPsiLockFactory.sol";

contract PsiLock is Initializable {
    using AddressUpgradeable for address;
    using SafeMath for uint;
    address factory;
    uint256 public locked = 0;
    uint256 public unlock_date = 0;
    address public owner;
    address public token;
    address public _owner;
    address public dpex_factory_address;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public start_date;
    uint256 public end_date;
    uint256 public rate;
    uint256 public min_allowed;
    uint256 public max_allowed;
    uint256 public collected;
    uint256 public pool_rate;
    uint256 public lock_duration;
    uint256 public uniswap_rate;

    bool public doRefund = false;

    constructor() {
        factory = msg.sender;
    }

    modifier onlyOwner() {  
        require(msg.sender == _owner);
        _; 
    }

    function setDpex_Address(address _address) public onlyOwner returns (bool) {
        dpex_factory_address = _address;
        return true;
    }

    mapping(address => uint) participant;
    
    // Initialize a new campaign (can only be triggered by the factory contract)
    function initialize(
        uint256[] calldata _data,
        address _token,
        address _owner_Address,
        uint256 _pool_rate,
        uint256 _lock_duration,
        uint256 _dpex_rate
    ) external initializer {
        require(msg.sender == factory,'You are not allowed to initialize a new Campaign');
        owner = _owner_Address; 
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
        uniswap_rate = _dpex_rate;
    }

    function buyTokens() public payable returns (uint256){
        require(isLive(), 'campaign is not live');
        require((msg.value >= min_allowed) && 
            (getGivenAmount(msg.sender).add(msg.value) <= max_allowed) && 
            (msg.value <= getRemaining()), 'The contract has insufficient funds or you are not allowed');
        participant[msg.sender] = participant[msg.sender].add(msg.value);
        collected = (collected).add(msg.value);
        return 1;
    }
    function withdrawTokens() public returns (uint256){
        require(locked == 1, 'liquidity is not yet added');
        uint256 amount = calculateAmount(participant[msg.sender]);
        require(IERC20(address(token)).transfer(msg.sender, amount),"can't transfer");
        participant[msg.sender] = 0;
        return amount;
    }
    function unlock(address _LPT, uint256 _amount) public returns (bool){
        require(locked == 1 || failed(), 'liquidity is not yet locked');
        require(address(_LPT) != address(token), 'You are not allowed to withdraw tokens');
        require(block.timestamp >= unlock_date, "can't recieve LP tokens");
        require(msg.sender == owner, 'You are not the owener');
        IERC20(address(_LPT)).transfer(msg.sender,_amount);
        return true;
    }

    // Add liqudity to uniswap and burn the remaining tokens, can only be executed when the campaign completes

    function psiLOCK() public returns(uint256){
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
        uint256 campaign_amount = collected.mul(uint(IPsiLockFactory(factory).fee())).div(1000);
        if(IDPexFactory(address(dpex_factory_address))
            .getPair(token,address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)) == address(0)) {

            IERC20(address(token)).approve(
                address(IPsiLockFactory(factory).dpex_router()),
                (hardCap.mul(rate)).div(1e18)
            );

            if(uniswap_rate > 0){
                IDPexRouter(address(IPsiLockFactory(factory).dpex_router()))
                    .addLiquidityETH{value : campaign_amount.mul(uniswap_rate).div(1000)} (
                        address(token),
                        ((campaign_amount.mul(uniswap_rate).div(1000)).mul(pool_rate)).div(1e18),
                        0,
                        0,
                        address(this),block.timestamp + 100000000
                    );
            }
            payable(IPsiLockFactory(factory).toFee()).transfer(collected.sub(campaign_amount));
            payable(owner).transfer(campaign_amount.sub(campaign_amount.mul(uniswap_rate).div(1000)));
        } else {
            doRefund = true;
        }
        return true;
    }


        // Check whether the campaign failed

        function failed() public view returns(bool){
            if((block.timestamp >= end_date) && softCap > collected){
                return true;
            }
            return false;
        }   

        // Allow Participants to withdraw funds when campaign fails
          
        function withdrawFunds() public returns(uint256){
            require(failed() || doRefund, "campaign didn't fail");
            require(participant[msg.sender] > 0, "You didn't participate in the campaign");
            uint256 withdrawAmount = participant[msg.sender].mul(uint(IPsiLockFactory(factory).fee())).div(1000);
            (msg.sender).transfer(withdrawAmount);
            payable(IPsiLockFactory(factory).toFee()).transfer(participant[msg.sender].sub(withdrawAmount));
            participant[msg.sender] = 0;
            return withdrawAmount;
        }  

        // Check whether the campaign is still live

        function isLive() public view returns(bool){
            if((block.timestamp < start_date)) return false;
            if((block.timestamp >= end_date)) return false;
            if((collected >= hardCap)) return false;
            return true;
        }

        // Returns amount in XYZ
        
        function calculateAmount(uint256 _amount) public view returns(uint256){
            return (_amount.mul(rate)).div(1e18);
        }
        
        function getRemaining() public view returns (uint256){
            return (hardCap).sub(collected);
        }
        function getGivenAmount(address _address) public view returns (uint256){
            return participant[_address];
        }

}
