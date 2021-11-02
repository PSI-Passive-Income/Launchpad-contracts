// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './IBEP20.sol';

interface IToken is IBEP20 {
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool burnable,
        bool mintable,
        uint256 minterDelay
    ) external;
}
