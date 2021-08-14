// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

interface IWETH {
    function balanceOf(address account) external view returns (uint256);
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;
}