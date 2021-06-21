// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IPSIPadCampaign {
    function psipad_factory() external view returns(address);

    function token() external view returns(address);
    function softCap() external view returns(uint256);
    function hardCap() external view returns(uint256);
    function start_date() external view returns(uint256);
    function end_date() external view returns(uint256);
    function rate() external view returns(uint256);
    function min_allowed() external view returns(uint256);
    function max_allowed() external view returns(uint256);
    function collected() external view returns(uint256);
    function pool_rate() external view returns(uint256);
    function lock_duration() external view returns(uint256);
    function liquidity_rate() external view returns(uint256);

    function factory_address() external view returns(address);
    function router_address() external view returns(address);
    function stable_coin_fee() external view returns(uint256);
    function token_fee() external view returns(uint256);

    function lp_address() external view returns(address);
    function locked() external view returns(uint256);
    function unlock_date() external view returns(uint256);

    function finalized() external view returns(bool);
    function doRefund() external view returns(bool);

    /**
     * @notice allows an participant to buy tokens (they can be claimed after the campaign succeeds)
     */
    function buyTokens() external payable;
    /**
     * @notice Emergency finalize the campaign when not triggered on buy. 
     * (only possible when minimum deposit is not possible anymore)
     */
    function emergencyFinalize() external;

    /**
     * @notice Add liqudity to an exchange and burn the remaining tokens, 
     * can only be executed when the campaign completes
     */
    function lock() external;
    /**
     * @notice allows the owner to unlock the LP tokens and any leftover tokens after the lock has ended
     */
    function unlock() external;
    
    /**
     * @notice Allow participants to withdraw tokens when campaign succeeds
     */
    function withdrawTokens() external returns (uint256);
    /**
     * @notice Allow participants to withdraw funds when campaign fails
     */
    function withdrawFunds() external;

    /**
     * @notice Check whether the campaign is still live
     */
    function isLive() external view returns(bool);
    /**
     * @notice Check whether the campaign failed
     */
    function failed() external view returns(bool);

    /**
     * @notice Returns amount in XYZ
     */
    function calculateAmount(uint256 _amount) external view returns(uint256);
    /**
     * @notice Get remaining tokens not sold
     */
    function getRemaining() external view returns (uint256);
    /**
     * Get an participants contribution
     */
    function getGivenAmount(address _address) external view returns (uint256);
}