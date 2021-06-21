// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract TokenLock is Initializable{
    using AddressUpgradeable for address;
    using SafeMath for uint;
    address factory;
    address public owner;
    address public token;
    uint256 public start_time;

    struct locking_Data {
        uint256 duration;
        string name;
        uint256 amount;
    }
    mapping(uint256 => locking_Data) public tokensLocked;
    constructor() {
        factory = msg.sender;
    }

    mapping(address => uint) participant;

    // Initialize a new campaign (can only be triggered by the factory contract)
    function initialize(locking_Data[] memory _data, address _token,address _owner_Address) external initializer {
        require(msg.sender == factory,'You are not allowed to initialize a new Campaign');
        owner = _owner_Address;
        token = _token;
        start_time = block.timestamp;
        for(uint256 i = 0; i < _data.length;i++) {
            tokensLocked[i] = _data[i];
        }
    }

    function withdrawTokens(uint256 _id, uint256 _amount) public returns (uint256){
        require(msg.sender == owner, 'You are not tokens owner');
        require((tokensLocked[_id].duration).add(start_time) <= block.timestamp, 
            'You are not allowed to withdraw the tokens yet');
        require(tokensLocked[_id].amount >= _amount);
        IERC20(address(token)).transfer(owner,_amount);
        tokensLocked[_id].amount = (tokensLocked[_id].amount).sub(_amount);
        return 1;
    }
}