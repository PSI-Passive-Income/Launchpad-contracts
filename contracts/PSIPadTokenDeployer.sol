// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import './PSIPadTokenModel.sol';
import "./interfaces/IPSIPadCampaignFactory.sol";

contract PSIPadTokenDeployer is Initializable {
     address public campaignFactory;
     address[] public Tokens;

    function initialize(address _campaignFactory) external initializer {
        campaignFactory = _campaignFactory;
    }

    function createTokenWithCampaign(
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals,
        uint256 _totalSupply,
        IPSIPadCampaign.CampaignData calldata _data
    ) public returns(address token_address) {
        bytes memory bytecode = type(PSIPadTokenModel).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_name, msg.sender));
        assembly {
            token_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        PSIPadTokenModel(token_address).initialize(_name, _symbol, _decimals, _totalSupply);
        IERC20Upgradeable(token_address).approve(
            campaignFactory,
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        IPSIPadCampaignFactory(campaignFactory).createCampaign(
            _data,
            token_address,
            0
        );
        IERC20Upgradeable(token_address).transfer(
            msg.sender, 
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        Tokens.push(token_address);
        return token_address;
    }
}
