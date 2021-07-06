// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './PSIPadTokenModel.sol';
import './interfaces/IPSIPadTokenDeployer.sol';
import './interfaces/IPSIPadCampaign.sol';
import './interfaces/IPSIPadCampaignFactory.sol';

contract PSIPadTokenDeployer is Initializable, IPSIPadTokenDeployer {
    address public override campaignFactory;
    address[] public override tokens;

    function initialize(address _campaignFactory) external initializer {
        campaignFactory = _campaignFactory;
    }

    function createTokenWithCampaign(TokenData calldata tokenData, IPSIPadCampaign.CampaignData calldata campaignData)
        external
        override
        returns (address token_address)
    {
        bytes memory bytecode = type(PSIPadTokenModel).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(tokenData.name, msg.sender));
        assembly {
            token_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        PSIPadTokenModel(token_address).initialize(tokenData.name, tokenData.symbol, tokenData.initialSupply);
        emit TokenCreated(token_address, tokenData.name, tokenData.symbol, tokenData.initialSupply);

        IERC20Upgradeable(token_address).approve(
            campaignFactory,
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        IPSIPadCampaignFactory(campaignFactory).createCampaignWithOwner(campaignData, msg.sender, token_address, 0);

        IERC20Upgradeable(token_address).transfer(
            msg.sender,
            IERC20Upgradeable(token_address).balanceOf(address(this))
        );
        tokens.push(token_address);
        return token_address;
    }
}
