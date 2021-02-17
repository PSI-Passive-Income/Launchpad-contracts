pragma solidity ^0.7.4

interface IDpexV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline 
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}}

interface IDpexV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPsiLockFactory {
    function fee() external view returns(uint);
    function uni_router() external view returns(address);
    function sushi_router() external view returns(address);
    function toFee() external view returns(uint);
}