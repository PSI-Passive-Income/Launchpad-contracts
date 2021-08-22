import { Wallet, Contract, providers } from 'ethers'
import { waffle, ethers, upgrades } from 'hardhat'

import { expandTo18Decimals, TOTAL_SUPPLY } from './utilities'

import { DPexRouter, DPexRouterPairs, DPexWETHWrapper, IBEP20, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory, DPexPairInitHash } from '@passive-income/dpex-swap-core/typechain'
import { PSI, PSIGovernance, FeeAggregator } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaign, PSIPadCampaignFactory, PSIPadTokenDeployer, PSIPadTokenLockFactory, Token, TokenAnySwap, TestBEP20 }  from '../../typechain';

import PSIPadCampaignAbi from '../../artifacts/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'
import TokenAbi from '../../artifacts/contracts/token/Token.sol/Token.json'
import TokenAnySwapAbi from '../../artifacts/contracts/token/TokenAnySwap.sol/TokenAnySwap.json'
import TestBEP20Abi from '../../artifacts/contracts/test/TestBEP20.sol/TestBEP20.json'
import WBNBAbi from '@passive-income/dpex-peripheral/artifacts/contracts/test/WBNB.sol/WBNB.json'
import DPexPairInitHashAbi from '@passive-income/dpex-swap-core/artifacts/contracts/DPexPairInitHash.sol/DPexPairInitHash.json'
import DPexFactoryAbi from '@passive-income/dpex-swap-core/artifacts/contracts/DPexFactory.sol/DPexFactory.json'
import PSIGovernanceAbi from '@passive-income/psi-contracts/artifacts/contracts/PSIGovernance.sol/PSIGovernance.json'
import FeeAggregatorAbi from '@passive-income/psi-contracts/artifacts/contracts/FeeAggregator.sol/FeeAggregator.json'
import DPexRouterPairsAbi from '@passive-income/dpex-peripheral/artifacts/contracts/DPexRouterPairs.sol/DPexRouterPairs.json'
import DPexRouterAbi from '@passive-income/dpex-peripheral/artifacts/contracts/DPexRouter.sol/DPexRouter.json'
import DPexWETHWrapperAbi from '@passive-income/dpex-peripheral/artifacts/contracts/DPexWETHWrapper.sol/DPexWETHWrapper.json'
import PSIAbi from '@passive-income/psi-contracts/artifacts/contracts/PSI.sol/PSI.json'

const overrides = {
  gasLimit: 9500000
}

interface V2Fixture {
  psi: PSI
  token: IBEP20
  WETH: IWETH
  baseToken: Token,
  baseTokenAnySwap: TokenAnySwap,
  feeAggregator: FeeAggregator
  factory: DPexFactory
  router: DPexRouter
  campaignFactory: PSIPadCampaignFactory
  tokenDeployer: PSIPadTokenDeployer
  tokenLockFactory: PSIPadTokenLockFactory
}

export async function v2Fixture([wallet]: Wallet[], provider: providers.Web3Provider): Promise<V2Fixture> {
  // deploy tokens
  const psi = await waffle.deployContract(wallet, PSIAbi, [], overrides) as unknown as PSI
  const token = await waffle.deployContract(wallet, TestBEP20Abi, [TOTAL_SUPPLY], overrides) as unknown as IBEP20
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
  await feeAggregator.addFeeToken(WETH.address)

  // init hash
  const initHash = await waffle.deployContract(wallet, DPexPairInitHashAbi, [], overrides) as unknown as DPexPairInitHash
  const hash = await initHash.get()

  // deploy router
  const routerPairs = await waffle.deployContract(wallet, DPexRouterPairsAbi, [], overrides) as unknown as DPexRouterPairs
  await routerPairs.initialize(feeAggregator.address, governance.address)
  await routerPairs.setFactory(factory.address, hash)//"0x8ce3d8395a2762e69b9d143e8364b606484fca5a5826adb06d61642abebe6a0f")
  const router = await waffle.deployContract(wallet, DPexRouterAbi, [], overrides) as unknown as DPexRouter
  await router.initialize(factory.address, routerPairs.address, WETH.address, feeAggregator.address, governance.address)
  await governance.setRouter(router.address, overrides)

  // weth wrapper
  const WETHWrapper = await waffle.deployContract(wallet, DPexWETHWrapperAbi, [router.address, WETH.address, governance.address], overrides) as DPexWETHWrapper
  await router.setWETHWrapper(WETHWrapper.address)

  // deploy PSIPadCampaignFactory
  const baseCampaign = await waffle.deployContract(wallet, PSIPadCampaignAbi, [], overrides) as PSIPadCampaign

  const PSIPadCampaignFactory = await ethers.getContractFactory("PSIPadCampaignFactory")
  const campaignFactory =  await upgrades.deployProxy(PSIPadCampaignFactory, [factory.address, router.address, feeAggregator.address, WETH.address, 100, 50, baseCampaign.address], {initializer: 'initialize'}) as unknown as PSIPadCampaignFactory
  await governance.setGovernanceLevel(campaignFactory.address, 50)

  // deploy PSIPadTokenDeployer
  const PSIPadTokenDeployer = await ethers.getContractFactory("PSIPadTokenDeployer");
  const tokenDeployer =  await upgrades.deployProxy(PSIPadTokenDeployer, [feeAggregator.address, WETH.address, expandTo18Decimals(0.2)], {initializer: 'initialize'}) as unknown as PSIPadTokenDeployer
  
  const baseToken = await waffle.deployContract(wallet, TokenAbi, [], overrides) as Token
  const baseTokenAnySwap = await waffle.deployContract(wallet, TokenAnySwapAbi, [], overrides) as TokenAnySwap
  await tokenDeployer.setTokenType(0, baseToken.address);
  await tokenDeployer.setTokenType(1, baseTokenAnySwap.address);

  // deploy PSIPadTokenLockFactory
  const PSIPadTokenLockFactory = await ethers.getContractFactory("PSIPadTokenLockFactory");
  const tokenLockFactory =  await upgrades.deployProxy(PSIPadTokenLockFactory, [feeAggregator.address, WETH.address, expandTo18Decimals(0.2)], {initializer: 'initialize'}) as unknown as PSIPadTokenLockFactory

  return {
    psi,
    token,
    WETH,
    baseToken,
    baseTokenAnySwap,
    feeAggregator,
    factory,
    router,
    campaignFactory,
    tokenDeployer,
    tokenLockFactory
  }
}
