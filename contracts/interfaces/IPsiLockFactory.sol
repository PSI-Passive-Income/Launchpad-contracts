// SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;

interface IPsiLockFactory {
    function dpex_router() external view returns(address);
    function createCampaign(
        uint256[] memory _data,
        address _token,
        uint256 _pool_rate,
        uint256 _lock_duration,
        uint256 _dpex_rate
    ) external returns (address campaign_address);
}