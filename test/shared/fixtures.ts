import { Wallet, Contract, providers } from 'ethers'
import { waffle, ethers, upgrades } from 'hardhat'

import { expandTo18Decimals, TOTAL_SUPPLY } from './utilities'

import { DPexRouter, DPexRouterPairs, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory } from '@passive-income/dpex-swap-core/typechain'
import { PSI, PSIGovernance, FeeAggregator } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaignFactory, PSIPadTokenDeployer, TestBEP20 }  from '../../typechain';

import TestBEP20Abi from '../../artifacts/contracts/test/TestBEP20.sol/TestBEP20.json'
import WBNBAbi from '@passive-income/dpex-peripheral/artifacts/contracts/test/WBNB.sol/WBNB.json'
import DPexFactoryAbi from '@passive-income/dpex-swap-core/artifacts/contracts/DPexFactory.sol/DPexFactory.json'
import PSIGovernanceAbi from '@passive-income/psi-contracts/artifacts/contracts/PSIGovernance.sol/PSIGovernance.json'
import FeeAggregatorAbi from '@passive-income/psi-contracts/artifacts/contracts/FeeAggregator.sol/FeeAggregator.json'
import DPexRouterPairsAbi from '@passive-income/dpex-peripheral/artifacts/contracts/DPexRouterPairs.sol/DPexRouterPairs.json'
import DPexRouterAbi from '@passive-income/dpex-peripheral/artifacts/contracts/DPexRouter.sol/DPexRouter.json'
import PSIAbi from '@passive-income/psi-contracts/artifacts/contracts/PSI.sol/PSI.json'

const overrides = {
  gasLimit: 9500000
}

interface V2Fixture {
  psi: PSI
  token: TestBEP20
  WETH: IWETH
  factory: DPexFactory
  router: DPexRouter
  campaignFactory: PSIPadCampaignFactory
  tokenDeployer: PSIPadTokenDeployer
}

export async function v2Fixture([wallet]: Wallet[], provider: providers.Web3Provider): Promise<V2Fixture> {
  // deploy tokens
  const psi = await waffle.deployContract(wallet, PSIAbi, [], overrides) as unknown as PSI
  const token = await waffle.deployContract(wallet, TestBEP20Abi, [TOTAL_SUPPLY], overrides) as unknown as TestBEP20
  const WETH = await waffle.deployContract(wallet, WBNBAbi, [], overrides) as unknown as IWETH

  // deploy factory
  const factory = await waffle.deployContract(wallet, DPexFactoryAbi, [], overrides) as unknown as DPexFactory
  await factory.initialize(wallet.address)
  // deploy governance contract
  const governance = await waffle.deployContract(wallet, PSIGovernanceAbi, [], overrides) as unknown as PSIGovernance
  await governance.initialize()

  // deploy fee aggregator
  const feeAggregator = await waffle.deployContract(wallet, FeeAggregatorAbi, [], overrides) as unknown as FeeAggregator
  await feeAggregator.initialize(governance.address, WETH.address, psi.address)

  // deploy router
  const routerPairs = await waffle.deployContract(wallet, DPexRouterPairsAbi, [], overrides) as unknown as DPexRouterPairs
  await routerPairs.initialize(feeAggregator.address, governance.address)
  await routerPairs.setFactory(factory.address, "0x8ce3d8395a2762e69b9d143e8364b606484fca5a5826adb06d61642abebe6a0f")
  const router = await waffle.deployContract(wallet, DPexRouterAbi, [], overrides) as unknown as DPexRouter
  await router.initialize(factory.address, routerPairs.address, WETH.address, feeAggregator.address, governance.address);
  await governance.setRouter(router.address, overrides);

  // deploy PSIPadCampaignFactory
  const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory");
  const campaignFactory =  await upgrades.deployProxy(PSIPadCampaignFactory, [factory.address, router.address], {initializer: 'initialize'}) as unknown as PSIPadCampaignFactory;

  // deploy PSIPadTokenDeployer
  const PSIPadTokenDeployer = await ethers.getContractFactory("PSIPadTokenDeployer");
  const tokenDeployer =  await upgrades.deployProxy(PSIPadTokenDeployer, [campaignFactory.address], {initializer: 'initialize'}) as unknown as PSIPadTokenDeployer;

  return {
    psi,
    token,
    WETH,
    factory,
    router,
    campaignFactory,
    tokenDeployer
  }
}
