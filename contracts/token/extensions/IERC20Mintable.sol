// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';

interface IERC20Mintable is IERC20Upgradeable {
    /**
     * @notice Whether the token is mintable or not
     */
    function mintable() external view returns (bool);

    /**
     * @notice The delay in seconds before it is possible to apply a new minter
     */
    function minterDelay() external view returns (uint256);

    /**
     * @notice Minters currently pending (return the timestamp when they can be applied)
     */
    function minterPending(address minter) external view returns (uint256);

    /**
     * @notice Return all minters currently configured
     */
    function minters() external view returns (address[] memory);

    /**
     * @notice Adding a new minter (needs to be applied first when a delay is configured)
     */
    function addMinter(address minter) external;

    /**
     * @notice Remove a minter. This is instantly possible
     */
    function removeMinter(address minter) external;

    /**
     * @notice Applies the new minter after the delay had ended
     * @dev This is only needed when a delay is configured
     */
    function applyMinter(address minter) external;

    /**
     * @notice Whether an addres is a minter or not
     */
    function isMinter(address minter) external view returns (bool);

    /**
     * @notice Creates `amount` tokens and assigns them to `account`, increasing the total supply.
     */
    function mint(address account, uint256 amount) external;
}
