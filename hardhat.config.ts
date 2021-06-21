import { HardhatUserConfig } from "hardhat/types";

// import "@nomiclabs/hardhat-ganache";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import 'hardhat-abi-exporter';
import "hardhat-tracer";
import "hardhat-dependency-compiler";
import 'hardhat-contract-sizer';
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-etherscan";

require("dotenv").config({path: `${__dirname}/.env`});

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
    hardhatnode: {
      url: `http://127.0.0.1:8545`,
      accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`]
    },
    bsctestnet: {
      url: "https://data-seed-prebsc-1-s2.binance.org:8545",
      chainId: 97,
      accounts: [`0x${process.env.BSC_TEST_PRIVATE_KEY}`],
      gasPrice: 15000000000,
    },
    ganache: {
      url: "HTTP://127.0.0.1:7545",
      chainId: 1337,
      accounts: [`0x767f7322259ccc3a24165da6767b2a76f7cd94b2e4b0f76beb65b8b07ec11990`]
    },
    ganachebscfork: {
      url: "HTTP://127.0.0.1:7546",
      chainId: 1337,
      accounts: [`0x1fee182f2c9006568480db38a8dbc6d3e109621fe6411382a2b603a383f2b3da`]
    }
    // rinkeby: {
    //   url: `${process.env.RINKEBY_INFURA}`,
    //   accounts: [`0x${process.env.RINKEBY_PRIVATE_KEY}`]
    // }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: `${process.env.BSC_API_TOKEN}`
  },
  solidity: {
    compilers: [
      { 
        version: "0.8.4",
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
  }  
};

export default config;