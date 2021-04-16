// SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import './tokenLock.sol';

contract TokenLockFactory is Initializable {
    using AddressUpgradeable for address;
    using SafeMath for uint;
    address factory_owner;
    mapping (address => address) totalLockedTokens;

    function initialize() external initializer {
        factory_owner = msg.sender;
    }

    modifier only_factory_Owner(){
        require(factory_owner == msg.sender, 'You are not the owner');
        _;
    }

    function lockTokens(
        TokenLock.locking_Data[] memory _data,
        address _token
    ) public returns (address tokenLock_address) {
        bytes memory bytecode = type(TokenLock).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, msg.sender, block.timestamp));
        assembly {
            tokenLock_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        uint256 totalAmount = 0;
        TokenLock(tokenLock_address).initialize(_data,_token,msg.sender);
        for (uint256 i = 0; i < _data.length; i++){
            totalAmount += _data[i].amount;
        }
        require(totalAmount > 0, 'right amount');
        require(IERC20(address(_token)).transferFrom(msg.sender,address(tokenLock_address), totalAmount), 
            'cannot transfer tokens');
        totalLockedTokens[_token] = tokenLock_address;
        return tokenLock_address;
    }
    
    function isTokenLocked(address _token) public view returns(address){
        return totalLockedTokens[_token];
    }

}
