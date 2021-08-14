import { HardhatUserConfig } from "hardhat/types";

// import "@nomiclabs/hardhat-ganache";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import 'hardhat-abi-exporter';
import "hardhat-tracer";
import "hardhat-dependency-compiler";
import 'hardhat-contract-sizer';
import "solidity-coverage";
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-etherscan";

require("dotenv").config({path: `${__dirname}/.env`});

let typeChainTarget = process.env.TYPECHAIN_TARGET as "ethers-v5" | "web3-v1" | "truffle-v5"
if (typeChainTarget !== "web3-v1" && typeChainTarget !==  "truffle-v5")
  typeChainTarget = "ethers-v5";

let typeChainOutDir = "typechain";
if (typeChainTarget === "web3-v1") typeChainOutDir = "typechain-web3"
if (typeChainTarget === "truffle-v5") typeChainOutDir = "typechain-truffle"

console.log(typeChainTarget, typeChainOutDir)

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // forking: {
      //   enabled: true,
      //   url: `${process.env.MAIN_ALCHEMY_URL}`,
      //   blockNumber: 11754056
      // }
    },
    bsctestnet: {
      url: "https://data-seed-prebsc-1-s2.binance.org:8545",
      chainId: 97,
      accounts: [`0x${process.env.BSC_TEST_PRIVATE_KEY}`],
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [`0x${process.env.BSC_PRIVATE_KEY}`],
    },
    ganache: {
      url: "HTTP://127.0.0.1:7545",
      chainId: 1337,
      accounts: [`0x767f7322259ccc3a24165da6767b2a76f7cd94b2e4b0f76beb65b8b07ec11990`]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: `${process.env.BSC_API_TOKEN}`
  },
  solidity: {
    compilers: [
      { 
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 30000
          }
        } 
      },
      { 
        version: "0.7.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 30000
          }
        } 
      }
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  typechain: {
    outDir: typeChainOutDir,
    target: typeChainTarget,
    alwaysGenerateOverloads: true
  }
};

export default config;