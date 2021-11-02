// npx hardhat run scripts/upgrade.ts

require("dotenv").config({path: `${__dirname}/.env`});
import { artifacts, ethers, upgrades, run } from "hardhat";

import { PSIPadCampaignFactory, PSIPadTokenDeployer, PSIPadTokenLockFactory, PSIPadCampaign } from '../typechain'
import PSIPadCampaignAbi from '../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'

const main = async() => {
  const signer = ethers.provider.getSigner("0x2C9C756A7CFd79FEBD2fa9b4C82c10a5dB9D8996"); // bsc test and main

  // const baseCampaign = new ethers.Contract("0xd1Fca24b40C8D633885Fa195A90491799a8E15c1", PSIPadCampaignAbi, signer) as PSIPadCampaign; // bsc test
  const PSIPadCampaign = await ethers.getContractFactory("PSIPadCampaign");
  const baseCampaign = await PSIPadCampaign.connect(signer).deploy() as PSIPadCampaign;
  await baseCampaign.deployed();
  console.log("PSIPadCampaign deployed to:", baseCampaign.address);

  const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory");
  const campaignFactory: PSIPadCampaignFactory = await upgrades.upgradeProxy("0xB390E793a90ADDD68eE92F6AC6c3BAcba06DfF78", PSIPadCampaignFactory) as PSIPadCampaignFactory;
  console.log("PSIPadCampaignFactory upgraded:", campaignFactory.address);

  await campaignFactory.setCloneAddress(baseCampaign.address)
  console.log("Clone address set");

  // const PSIPadTokenDeployer = await ethers.getContractFactory("PSIPadTokenDeployer");
  // const deployer: PSIPadTokenDeployer = await upgrades.upgradeProxy("0x69892baba78adda6b55a9008c36c56c8ccb3f3e9", PSIPadTokenDeployer) as PSIPadTokenDeployer;
  // console.log("PSIPadTokenDeployer upgraded:", deployer.address);
}

main()
//   .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
