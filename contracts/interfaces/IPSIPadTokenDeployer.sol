// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./IPSIPadCampaign.sol";

interface IPSIPadTokenDeployer {
    function campaignFactory() external view returns(address);
    function tokens(uint256 idx) external view returns(address);

    event TokenCreated(address token, string name, string symbol, uint256 totalSupply);

    function createTokenWithCampaign(
        string calldata _name,
        string calldata _symbol,
        uint256 _totalSupply,
        IPSIPadCampaign.CampaignData calldata _data
    ) external returns(address token_address);
}
