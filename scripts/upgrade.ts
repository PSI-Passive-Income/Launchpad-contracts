// npx hardhat run scripts/upgrade.ts

require("dotenv").config({path: `${__dirname}/.env`});
import { artifacts, ethers, upgrades, run } from "hardhat";

import { PSIPadCampaignFactory, PSIPadTokenDeployer, PSIPadTokenLockFactory } from '../typechain'

const main = async() => {
  const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory");
  const campaignFactory: PSIPadCampaignFactory = await upgrades.upgradeProxy("0xBFf0D82794b1Fa4B031dD85A800340214C28CF84", PSIPadCampaignFactory) as PSIPadCampaignFactory;
  console.log("PSIPadCampaignFactory upgraded:", campaignFactory.address);

  // const PSIPadTokenDeployer = await ethers.getContractFactory("PSIPadTokenDeployer");
  // const deployer: PSIPadTokenDeployer = await upgrades.upgradeProxy("0xE431399b0FD372DF941CF5e23DBa9FC9Ad605FeF", PSIPadTokenDeployer) as PSIPadTokenDeployer;
  // console.log("PSIPadTokenDeployer upgraded:", deployer.address);
}

main()
//   .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
