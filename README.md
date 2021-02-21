# Launchpad-contracts

## Functions 

### psiLockFactory/createCampaign(...)
Calling this function will create a campaign with the desired parameters.

```solidity
function createCampaign(uint[] memory _data,address _token,uint _pool_rate,uint _lock_duration,uint _uniswap_rate,uint _rnAMM) public returns (address campaign_address) {
  /**
  * uint[] memory _data : uint array with parameters for campaign
  *   data[0] : soft cap
  *.  data[1] : hard cap
  *   data[2] : start date
  *.  data[3] : end date
  *   data[4] : swap rate
  *   data[5] : minimum allowed
  *   data[6] : max allowed
  * address _token : token address
  * uint _pool_rate : pool rate for token
  * uint _lock_duration : duration to lock liquidity
  * uint _uniswap_rate : % of liquidity to be allocated to 
  * uint rnAMM : I'm not sure how this works? I think 100 = uniswap and 0 equals sushi but i need to work this out
  *
  * returns campaign address for ICO
  */
 }

```
