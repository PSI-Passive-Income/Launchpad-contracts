// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IPSIPadTokenLockFactory {
    function fee_aggregator() external view returns(address);
    function stable_coin() external  view returns(address);
    function stable_coin_fee() external view returns(uint256);
    function token_fee() external view returns(uint256);

    function setFeeAggregator(address _fee_aggregator) external;
    function setStableCoin(address _stable_coin) external;
    function setStableCoinFee(uint256 _stable_coin_fee) external;
    function setTokenFee(uint256 _token_fee) external;

    function lock(address token, uint256 amount, uint256 start_time, uint256 duration, uint256 releases) 
        external returns(uint256);
    function changeOwner(uint256 lockId, address newOwner) external;
    function unlock(uint256 lockId, uint256 amount) external;
    function unlockAvailable(uint256 lockId) external;
    function amountToUnlock(uint256 lockId) external view returns (uint256);
    function unlockedAmount(uint256 lockId) external view returns (uint256);
}