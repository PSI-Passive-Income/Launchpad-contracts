// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

interface IPSIPadFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}
