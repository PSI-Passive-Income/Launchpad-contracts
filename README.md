# Launchpad contracts

This project is using [Hardhat](https://hardhat.org/getting-started/) for development, compiling, testing and deploying. The development tool used for development is [Visual Studio Code](https://code.visualstudio.com/) which has [great plugins](https://hardhat.org/guides/vscode-tests.html) for solidity development and mocha testing.

## Contracts

* Binance Chain
  * PSI : [0x6e70194F3A2D1D0a917C2575B7e33cF710718a17](https://bscscan.com/address/0x6e70194F3A2D1D0a917C2575B7e33cF710718a17)
  * PSIPadCampaignFactory : [0x0Bf75738E1eb3E1c2449e93201fE0C5605c2CB12](https://bscscan.com/address/0x0Bf75738E1eb3E1c2449e93201fE0C5605c2CB12)
    * Default Campaign : [0xbcd1c8704ebe73ce3578033554e537f74bdc02f6](https://bscscan.com/address/0xbcd1c8704ebe73ce3578033554e537f74bdc02f6)
  * PSIPadTokenDeployer : [0x98A06bf208b09270B40C34b39F9a11BBd6b00826](https://bscscan.com/address/0x98A06bf208b09270B40C34b39F9a11BBd6b00826)
    * Default Token : [0x05fd532d8dE7F6355F2F9a801b3ab1F52c41Df24](https://bscscan.com/address/0x05fd532d8dE7F6355F2F9a801b3ab1F52c41Df24)
    * Default Token AnySwap : [0x745118AA84aa32aa8DD91cFaE1eC59c14B22a51B](https://bscscan.com/address/0x745118AA84aa32aa8DD91cFaE1eC59c14B22a51B)
  * PSIPadTokenLockFactory : [0xFB5F1288A8a4Dea04e6aD57Da0cf8A135Ed39E15](https://bscscan.com/address/0xFB5F1288A8a4Dea04e6aD57Da0cf8A135Ed39E15)

* Binance Test Chain
  * PSI : [0x6C31B672AB6B4D455608b33A11311cd1C9BdBA1C](https://testnet.bscscan.com/address/0x6C31B672AB6B4D455608b33A11311cd1C9BdBA1C)
  * PSIPadCampaignFactory : [0xB390E793a90ADDD68eE92F6AC6c3BAcba06DfF78](https://testnet.bscscan.com/address/0xB390E793a90ADDD68eE92F6AC6c3BAcba06DfF78)
    * Default Campaign : [0x1C17919713EBF29c5bC9c133031c7be1c3C11082](https://testnet.bscscan.com/address/0x1C17919713EBF29c5bC9c133031c7be1c3C11082)
  * PSIPadTokenDeployer : [0x69892baba78adda6b55a9008c36c56c8ccb3f3e9](https://testnet.bscscan.com/address/0x69892baba78adda6b55a9008c36c56c8ccb3f3e9)
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