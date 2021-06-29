// npx hardhat run scripts/deploy.ts

require("dotenv").config({path: `${__dirname}/.env`});
import { artifacts, ethers, upgrades, run } from "hardhat";

import { PSIPadCampaignFactory, PSIPadTokenDeployer, PSIPadTokenLockFactory } from '../typechain'

import PSIPadCampaignFactoryAbi from '../abi/contracts/PSIPadCampaignFactory.sol/PSIPadCampaignFactory.json'
import PSIPadTokenDeployerAbi from '../abi/contracts/PSIPadTokenDeployer.sol/PSIPadTokenDeployer.json'
import PSIPadTokenLockFactoryAbi from '../abi/contracts/PSIPadTokenLockFactory.sol/PSIPadTokenLockFactory.json'
import { BigNumber } from "@ethersproject/bignumber";

const main = async() => {

  // const signer = ethers.provider.getSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // hardhat
  // const signer = ethers.provider.getSigner("0xCCD0C72BAA17f4d3217e6133739de63ff6F0b462"); // ganache
  const signer = ethers.provider.getSigner("0x2C9C756A7CFd79FEBD2fa9b4C82c10a5dB9D8996"); // bsc test and main

  // const psi: string = "0xD30084E9d1271f803e26A0545E2D031013956D9E"; // ganache
  const psi: string = "0x066Bd99080eC62FE0E28bA687A53aC00794c17b6"; // bsc test
  // const psi: string = "0x9A5d9c681Db43D9863e9279c800A39449B7e1d6f"; // bsc main

  // const baseContract: string = "0xdde6aAe82eEC0499F8A38290A78C30927Ad883a8"; // ganache
  const baseContract: string = "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // bsc test
  // const baseContract: string = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // bsc main

  // const router: string = ""; // ganache
  const router: string = "0xF561518cDaE1d0795e8077730aD5A28096cC6a5F"; // bsc test
  // const router: string = "0xeEdF12C62b8930EC7a1c729616870898D5E8c586"; // bsc main

  // const factory: string = ""; // ganache
  const factory = "0x4FA3c5c24c55ED946B304F72D33FF24835fb2aB6"; // bsc test
  // const factory: string = "0x92Be203e0dfb40c1a1F937a36929E02856257A2e"; // bsc main

  // const feeAggregator: string = ""; // ganache
  const feeAggregator = "0xdA56896De5A1aF4E3f32c0e8A8b8A06Ca90CB50c"; // bsc test
  // const feeAggregator: string = "0xE431399b0FD372DF941CF5e23DBa9FC9Ad605FeF"; // bsc main

  console.log("deploying");

  // const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory");
  // const campaignFactory: PSIPadCampaignFactory = await upgrades.deployProxy(PSIPadCampaignFactory, [factory, router, feeAggregator, baseContract, 100, 50], { initializer: 'initialize' }) as PSIPadCampaignFactory;
  // await campaignFactory.deployed();
  // console.log("PSIPadCampaignFactory deployed to:", campaignFactory.address);

  // const PSIPadTokenDeployer = await ethers.getContractFactory("PSIPadTokenDeployer");
  // const tokenDeployer: PSIPadTokenDeployer = await upgrades.deployProxy(PSIPadTokenDeployer, [campaignFactory.address], { initializer: 'initialize' }) as PSIPadTokenDeployer;
  // await tokenDeployer.deployed();
  // console.log("PSIPadTokenDeployer deployed to:", tokenDeployer.address);

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
