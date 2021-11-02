// npx hardhat run scripts/deploy.ts

require("dotenv").config({path: `${__dirname}/.env`});
import { artifacts, ethers, upgrades, run } from "hardhat";

import { PSIPadCampaign, PSIPadCampaignFactory, PSIPadTokenDeployer, PSIPadTokenLockFactory, Token, TokenAnySwap } from '../typechain'

import PSIPadCampaignFactoryAbi from '../abi/contracts/PSIPadCampaignFactory.sol/PSIPadCampaignFactory.json'
import PSIPadTokenDeployerAbi from '../abi/contracts/PSIPadTokenDeployer.sol/PSIPadTokenDeployer.json'
import PSIPadTokenLockFactoryAbi from '../abi/contracts/PSIPadTokenLockFactory.sol/PSIPadTokenLockFactory.json'
import PSIPadCampaignAbi from '../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'
import TokenAbi from '../abi/contracts/token/Token.sol/Token.json'
import TokenAnySwapAbi from '../abi/contracts/token/TokenAnySwap.sol/TokenAnySwap.json'

const main = async() => {

  // const signer = ethers.provider.getSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // hardhat
  // const signer = ethers.provider.getSigner("0xCCD0C72BAA17f4d3217e6133739de63ff6F0b462"); // ganache
  const signer = ethers.provider.getSigner("0x2C9C756A7CFd79FEBD2fa9b4C82c10a5dB9D8996"); // bsc test and main

  // const baseContract: string = "0xdde6aAe82eEC0499F8A38290A78C30927Ad883a8"; // ganache
  // const baseContract: string = "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // bsc test
  const baseContract: string = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // bsc main

  // const router: string = ""; // ganache
  // const router: string = "0xF561518cDaE1d0795e8077730aD5A28096cC6a5F"; // bsc test
  const router: string = "0xeEdF12C62b8930EC7a1c729616870898D5E8c586"; // bsc main

  // const factory: string = ""; // ganache
  // const factory = "0x4FA3c5c24c55ED946B304F72D33FF24835fb2aB6"; // bsc test
  const factory: string = "0x92Be203e0dfb40c1a1F937a36929E02856257A2e"; // bsc main

  // const feeAggregator: string = ""; // ganache
  // const feeAggregator = "0xdA56896De5A1aF4E3f32c0e8A8b8A06Ca90CB50c"; // bsc test
  const feeAggregator: string = "0xE431399b0FD372DF941CF5e23DBa9FC9Ad605FeF"; // bsc main

  console.log("deploying");

  // const baseCampaign = new ethers.Contract("0xd1Fca24b40C8D633885Fa195A90491799a8E15c1", PSIPadCampaignAbi, signer) as PSIPadCampaign; // bsc test
  const PSIPadCampaign = await ethers.getContractFactory("PSIPadCampaign");
  const baseCampaign = await PSIPadCampaign.connect(signer).deploy() as PSIPadCampaign;
  await baseCampaign.deployed();
  console.log("PSIPadCampaign deployed to:", baseCampaign.address);

  // const campaignFactory = new ethers.Contract("0xB390E793a90ADDD68eE92F6AC6c3BAcba06DfF78", PSIPadCampaignFactoryAbi, signer) as PSIPadCampaignFactory; // bsc test
  const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory");
  const campaignFactory: PSIPadCampaignFactory = await upgrades.deployProxy(PSIPadCampaignFactory, [factory, router, feeAggregator, baseContract, 200, 0, baseCampaign.address], { initializer: 'initialize' }) as PSIPadCampaignFactory;
  await campaignFactory.deployed();
  console.log("PSIPadCampaignFactory deployed to:", campaignFactory.address);

  const PSIPadTokenDeployer = await ethers.getContractFactory("PSIPadTokenDeployer");
  const tokenDeployer: PSIPadTokenDeployer = await upgrades.deployProxy(PSIPadTokenDeployer, [feeAggregator, baseContract, ethers.utils.parseUnits("0.2", 18)], { initializer: 'initialize' }) as PSIPadTokenDeployer;
  await tokenDeployer.deployed();
  console.log("PSIPadTokenDeployer deployed to:", tokenDeployer.address);

  // const baseToken = new ethers.Contract("0x0dA67cC8f76142797CaAbC37e9D1f950f40167A9", TokenAbi, signer) as Token; // bsc test
  const Token = await ethers.getContractFactory("Token");
  const baseToken = await Token.connect(signer).deploy() as Token;
  await baseToken.deployed();
  console.log("Token deployed to:", baseToken.address);
  // const baseTokenAnySwap = new ethers.Contract("0x8f8a02E84BFBD6d8606f366549BF9217F6b52d16", TokenAnySwapAbi, signer) as TokenAnySwap; // bsc test
  const TokenAnySwap = await ethers.getContractFactory("TokenAnySwap");
  const baseTokenAnySwap = await TokenAnySwap.connect(signer).deploy() as TokenAnySwap;
  await baseTokenAnySwap.deployed();
  console.log("TokenAnySwap deployed to:", baseTokenAnySwap.address);
  await (await tokenDeployer.setTokenType(0, baseToken.address)).wait();
  await (await tokenDeployer.setTokenType(1, baseTokenAnySwap.address)).wait();
  console.log("Base tokens set");

  const PSIPadTokenLockFactory = await ethers.getContractFactory("PSIPadTokenLockFactory");
  const tokenLockFactory: PSIPadTokenLockFactory = await upgrades.deployProxy(PSIPadTokenLockFactory, [feeAggregator, baseContract, ethers.utils.parseUnits("0.2", 18)], { initializer: 'initialize' }) as PSIPadTokenLockFactory;
  await tokenLockFactory.deployed();
  console.log("PSIPadTokenLockFactory deployed to:", tokenLockFactory.address);
}

main()
//   .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
