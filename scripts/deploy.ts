// npx hardhat run scripts/deploy.ts

require("dotenv").config({path: `${__dirname}/.env`});
import { artifacts, ethers, upgrades, run } from "hardhat";

import { PsiLockFactory, TokenDeployer, TokenLockFactory } from '../typechain'

import PsiLockFactoryAbi from '../abi/contracts/PsiLockFactory.sol/PsiLockFactory.json'
import TokenDeployerAbi from '../abi/contracts/TokenDeployer.sol/TokenDeployer.json'
import TokenLockFactoryAbi from '../abi/contracts/TokenLockFactory.sol/TokenLockFactory.json'
import { BigNumber } from "@ethersproject/bignumber";

const main = async() => {

  // const signer = ethers.provider.getSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // hardhat
  // const signer = ethers.provider.getSigner("0xCCD0C72BAA17f4d3217e6133739de63ff6F0b462"); // ganache
  const signer = ethers.provider.getSigner("0x2C9C756A7CFd79FEBD2fa9b4C82c10a5dB9D8996"); // bsc test and main

  // const psi: string = "0xD30084E9d1271f803e26A0545E2D031013956D9E"; // ganache
  const psi: string = "0x066Bd99080eC62FE0E28bA687A53aC00794c17b6"; // bsc test
  // const psi: string = "0x9A5d9c681Db43D9863e9279c800A39449B7e1d6f"; // bsc main

  // let router: string = ""; // ganache
  let router: string = "0xF561518cDaE1d0795e8077730aD5A28096cC6a5F"; // bsc test
  // let router: string = "0xeEdF12C62b8930EC7a1c729616870898D5E8c586"; // bsc main

  console.log("deploying");

  const PsiLockFactory = await ethers.getContractFactory("PsiLockFactory");
  const psiLockFactory: PsiLockFactory = await upgrades.deployProxy(PsiLockFactory, [psi, ethers.utils.parseUnits("1000", 18), BigNumber.from(1), router], { initializer: 'initialize' }) as PsiLockFactory;
  await psiLockFactory.deployed();
  console.log("PsiLockFactory deployed to:", psiLockFactory.address);

  const TokenDeployer = await ethers.getContractFactory("TokenDeployer");
  const tokenDeployer: TokenDeployer = await upgrades.deployProxy(TokenDeployer, [psiLockFactory.address], { initializer: 'initialize' }) as TokenDeployer;
  await tokenDeployer.deployed();
  console.log("TokenDeployer deployed to:", tokenDeployer.address);

  const TokenLockFactory = await ethers.getContractFactory("TokenLockFactory");
  const tokenLockFactory: TokenLockFactory = await upgrades.deployProxy(TokenLockFactory, [psi, ethers.utils.parseUnits("10", 9)], { initializer: 'initialize' }) as TokenLockFactory;
  await tokenLockFactory.deployed();
  console.log("TokenLockFactory deployed to:", tokenLockFactory.address);
}

main()
//   .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
