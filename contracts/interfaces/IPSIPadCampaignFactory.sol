// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IPSIPadCampaignFactory {
    function default_factory() external view returns(address);
    function default_router() external view returns(address);
    function fee_aggregator() external view returns(address);

    function stable_coin() external  view returns(address);
    function stable_coin_fee() external view returns(uint256);
    function token_fee() external view returns(uint256);

    function setDefaultFactory(address _default_factory) external;
    function setDefaultRouter(address _default_router) external;
    function setFeeAggregator(address _fee_aggregator) external;
    function setStableCoin(address _stable_coin) external;
    function setStableCoinFee(uint256 _stable_coin_fee) external;
    function setTokenFee(uint256 _token_fee) external;

    function createCampaign(
        uint256[] memory _data,
        address _token,
        uint256 _pool_rate,
        uint256 _lock_duration,
        uint256 _liquidity_rate,
        uint256 _tokenFeePercentage
    ) external returns (address campaign_address);

    function tokensNeeded(
        uint256[] memory _data,
        uint256 _pool_rate,
        uint256 _liquidity_rate,
        uint256 _tokenFeePercentage
    ) external view returns (uint256 _tokensNeeded);
}