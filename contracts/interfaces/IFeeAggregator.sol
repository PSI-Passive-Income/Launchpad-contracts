// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.6;

interface IFeeAggregator {
    function addFeeToken(address token) external;
    function addTokenFee(address token, uint256 fee) external;
}
