// npx hardhat run scripts/upgrades/20211220-added_whitelisting.ts --network bsctestnet

require("dotenv").config({path: `${__dirname}/.env`});
import { ethers, upgrades } from "hardhat";

import { PSIPadCampaignFactory, PSIPadCampaign } from '../../typechain'
import PSIPadCampaignAbi from '../../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'

const main = async() => {
  const signer = ethers.provider.getSigner("0x2C9C756A7CFd79FEBD2fa9b4C82c10a5dB9D8996"); // bsc test and main

  // const baseCampaign = new ethers.Contract("0x1C17919713EBF29c5bC9c133031c7be1c3C11082", PSIPadCampaignAbi, signer) as PSIPadCampaign; // bsc test
  // const baseCampaign = new ethers.Contract("0xbcd1c8704ebe73ce3578033554e537f74bdc02f6", PSIPadCampaignAbi, signer) as PSIPadCampaign; // bsc main
  const PSIPadCampaign = await ethers.getContractFactory("PSIPadCampaign");
  const baseCampaign = await PSIPadCampaign.connect(signer).deploy() as PSIPadCampaign;
  await baseCampaign.deployed();
  console.log("PSIPadCampaign deployed to:", baseCampaign.address);
  
  // let campaignFactory = new ethers.Contract("0xB390E793a90ADDD68eE92F6AC6c3BAcba06DfF78", PSIPadCampaignAbi, signer) as PSIPadCampaignFactory; // bsc test
  let campaignFactory = new ethers.Contract("0x0Bf75738E1eb3E1c2449e93201fE0C5605c2CB12", PSIPadCampaignAbi, signer) as PSIPadCampaignFactory; // bsc main
  const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory");
  campaignFactory = await upgrades.upgradeProxy(campaignFactory.address, PSIPadCampaignFactory) as PSIPadCampaignFactory;
  console.log("PSIPadCampaignFactory upgraded:", campaignFactory.address);

  await (await campaignFactory.setCloneAddress(baseCampaign.address)).wait()
  console.log("Clone address set");
}

main()
//   .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
