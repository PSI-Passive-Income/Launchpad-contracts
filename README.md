# Launchpad contracts

This project is using [Hardhat](https://hardhat.org/getting-started/) for development, compiling, testing and deploying. The development tool used for development is [Visual Studio Code](https://code.visualstudio.com/) which has [great plugins](https://hardhat.org/guides/vscode-tests.html) for solidity development and mocha testing.

## Contracts

* Binance Chain
  * PSI : [0x9A5d9c681Db43D9863e9279c800A39449B7e1d6f](https://bscscan.com/address/0x9A5d9c681Db43D9863e9279c800A39449B7e1d6f)

* Binance Test Chain
  * PSI : [0x066Bd99080eC62FE0E28bA687A53aC00794c17b6](https://testnet.bscscan.com/address/0x066Bd99080eC62FE0E28bA687A53aC00794c17b6)

## Functions 

### psiLockFactory/createCampaign(...)
Calling this function will create a campaign with the desired parameters.

```solidity
function createCampaign(uint[] memory _data,address _token,uint _pool_rate,uint _lock_duration,uint _liquidity_rate,uint _rnAMM) public returns (address campaign_address) {
  /**
  * uint[] memory _data : uint array with parameters for campaign
  *   data[0] : soft cap
  *.  data[1] : hard cap
  *   data[2] : start date
  *.  data[3] : end date
  *   data[4] : rate : amount of tokens 
  *   data[5] : minimum allowed
  *   data[6] : max allowed
  * address _token : token address
  * uint _pool_rate : swap rate (tokens per ETH)
  * uint _lock_duration : duration to lock liquidity
  * uint _liquidity_rate : % of raised funds to lock 
  * uint rnAMM : I'm not sure how this works? I think 100 = uniswap and 0 equals sushi but i need to work this out
  *
  * returns campaign address for ICO
  */
 }

```

###  psiLock/buyTokens(...)
Calling this function will trasnfer tokens from participent and stores deposit

```solidity
function buyTokens() public payable returns (uint){
  /**
  * Let participant chose how much the would like to buy and then set it with {value : ...} when you call the function.
  */
}
```

### psiLock/getGivenAmmount(...)
Calling this function will return a participants amount deposited in the given campaign

```solidity
function getGivenAmount(address _address){
  /**
  * When calling the function, specify the address of the campaign that the participant would like to view.
  */
}
```

### psiLock/getRemaining(...)
Calling this function will return the remaining funds needed to raise for a given campaign.

```solidity
function getRemaining(address _address){
  /**
  * When calling this function, specify the address of the campaing the participant would like to view.
  */
}
```

## Compiling

Introduction to compiling these contracts

### Install needed packages

```npm
npm install or yarn install
```

### Compile code

```npm
npx hardhat compile
```

### Test code

```node
npx hardhat test
```

### Run a local development node

This is needed before a truffle migrate to the development network. You can also use this for local development with for example metamask. [Hardhat node guide](https://hardhat.org/hardhat-network/)

```node
npx hardhat node
```

### Scripts

Use the scripts in the "scripts" folder. Each script has the command to start it on top.

Make sure you have set the right settings in your ['.env' file](https://www.npmjs.com/package/dotenv). You have to create this file with the following contents yourself:

```node
BSC_PRIVATE_KEY=<private_key>
BSC_TEST_PRIVATE_KEY=<private_key>
KOVAN_PRIVATE_KEY=<private_key>
RINKEBY_PRIVATE_KEY=<private_key>
GOERLI_PRIVATE_KEY=<private_key>
MAIN_PRIVATE_KEY=<private_key>

KOVAN_INFURA=https://kovan.infura.io/v3/<infura_key>
RINKEBY_INFURA=https://rinkeby.infura.io/v3/<infura_key>
GOERLI_INFURA=https://goerli.infura.io/v3/<infura_key>
MAIN_INFURA=https://mainnet.infura.io/v3/<infura_key>

MAIN_ALCHEMY_URL=https://eth-mainnet.alchemyapi.io/v2/<alchemy_key>
KOVAN_ALCHEMY_URL=https://eth-kovan.alchemyapi.io/v2/<alchemy_key>

ETHERSCAN_API_TOKEN=<etherscan_api_token>
BSC_API_TOKEN=<bscscan_api_token>
```

### Flatten contracts

```node
npx hardhat flatten contracts/DPexRouter.sol > contracts-flattened/DPexRouter.sol
```