// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import './PSIPadTokenModel.sol';
import "./interfaces/IPSIPadTokenDeployer.sol";
import "./interfaces/IPSIPadCampaign.sol";
import "./interfaces/IPSIPadCampaignFactory.sol";

contract PSIPadTokenDeployer is Initializable, IPSIPadTokenDeployer {
     address public override campaignFactory;
     address[] public override tokens;

    function initialize(address _campaignFactory) external initializer {
        campaignFactory = _campaignFactory;
    }

    function createTokenWithCampaign(
        string calldata _name,
        string calldata _symbol,
        uint256 _totalSupply,
        IPSIPadCampaign.CampaignData calldata _data
    ) external override returns(address token_address) {
        bytes memory bytecode = type(PSIPadTokenModel).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_name, msg.sender));
        assembly {
            token_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        PSIPadTokenModel(token_address).initialize(_name, _symbol, _totalSupply);
        emit TokenCreated(token_address, _name, _symbol, _totalSupply);

        IERC20Upgradeable(token_address).approve(
            campaignFactory,
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        IPSIPadCampaignFactory(campaignFactory).createCampaignWithOwner(
            _data,
            msg.sender,
            token_address,
            0
        );

        IERC20Upgradeable(token_address).transfer(
            msg.sender, 
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        tokens.push(token_address);
        return token_address;
    }
}
