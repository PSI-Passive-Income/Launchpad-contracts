// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import './IPSIPadCampaign.sol';

interface IPSIPadTokenDeployer {
    struct TokenData {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 maximumSupply;
        bool burnable;
        bool mintable;
        bool operable;
        bool tokenRecover;
        bool crossChain;
    }

    function campaignFactory() external view returns (address);

    function tokens(uint256 idx) external view returns (address);

    event TokenCreated(address token, string name, string symbol, uint256 totalSupply);

    function createTokenWithCampaign(TokenData calldata tokenData, IPSIPadCampaign.CampaignData calldata campaignData)
        external
        returns (address token_address);
}
