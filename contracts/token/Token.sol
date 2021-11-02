// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './BaseToken.sol';

contract Token is BaseToken {
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool burnable,
        bool mintable,
        uint256 minterDelay
    ) public virtual initializer {
        __BaseToken_init(name, symbol, initialSupply, maxSupply, burnable, mintable, minterDelay);
    }
}
