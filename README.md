# Launchpad contracts

This project is using [Hardhat](https://hardhat.org/getting-started/) for development, compiling, testing and deploying. The development tool used for development is [Visual Studio Code](https://code.visualstudio.com/) which has [great plugins](https://hardhat.org/guides/vscode-tests.html) for solidity development and mocha testing.

## Contracts

* Binance Chain
  * PSI : [0x9A5d9c681Db43D9863e9279c800A39449B7e1d6f](https://bscscan.com/address/0x9A5d9c681Db43D9863e9279c800A39449B7e1d6f)

* Binance Test Chain
  * PSI : [0x066Bd99080eC62FE0E28bA687A53aC00794c17b6](https://testnet.bscscan.com/address/0x066Bd99080eC62FE0E28bA687A53aC00794c17b6)
  * PSIPadCampaignFactory : [0xBFf0D82794b1Fa4B031dD85A800340214C28CF84](https://testnet.bscscan.com/address/0xBFf0D82794b1Fa4B031dD85A800340214C28CF84)
  * PSIPadTokenDeployer : [0xE534aF35D55fa10075883b65C502eDF48F7Ebe95](https://testnet.bscscan.com/address/0xE534aF35D55fa10075883b65C502eDF48F7Ebe95)
    * Default Token : [0x0dA67cC8f76142797CaAbC37e9D1f950f40167A9](https://testnet.bscscan.com/address/0x0dA67cC8f76142797CaAbC37e9D1f950f40167A9)
    * Default Token AnySwap : [0x8f8a02E84BFBD6d8606f366549BF9217F6b52d16](https://testnet.bscscan.com/address/0x8f8a02E84BFBD6d8606f366549BF9217F6b52d16)
  * PSIPadTokenLockFactory : [0x964c5cA7Abb66f53e912f0E0d8F17eD0FBbB9042](https://testnet.bscscan.com/address/0x964c5cA7Abb66f53e912f0E0d8F17eD0FBbB9042)

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

BSC_API_TOKEN=<bscscan_api_token>
```

### Flatten contracts

```node
npx hardhat flatten contracts/DPexRouter.sol > contracts-flattened/DPexRouter.sol
```