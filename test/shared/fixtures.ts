import { Wallet, Contract, providers } from 'ethers'
import { waffle, ethers, upgrades } from 'hardhat'

import { expandTo18Decimals } from './utilities'

import { PSI, PSIGovernance, FeeAggregator } from '@passive-income/psi-contracts/typechain';
import { DPexFactory, IDPexPair } from '@passive-income/dpex-swap-core/typechain'
import { DPexRouter, DPexRouterPairs, IBEP20, IWETH, PancakeFactory, PancakePair, DPexWETHWrapper } from '../../typechain'

import PSIAbi from '@passive-income/psi-contracts/abi/contracts/PSI.sol/PSI.json'
import PSIGovernanceAbi from '@passive-income/psi-contracts/artifacts/contracts/PSIGovernance.sol/PSIGovernance.json'
import FeeAggregatorAbi from '@passive-income/psi-contracts/artifacts/contracts/FeeAggregator.sol/FeeAggregator.json'
import DPexFactoryAbi from '@passive-income/dpex-swap-core/artifacts/contracts/DPexFactory.sol/DPexFactory.json'
import IDPexPairAbi from '@passive-income/dpex-swap-core/artifacts/contracts/interfaces/IDPexPair.sol/IDPexPair.json'

import ERC20Abi from '../../artifacts/contracts/test/ERC20.sol/ERC20.json'
import WBNBAbi from '../../artifacts/contracts/test/WBNB.sol/WBNB.json'
import DPexRouterAbi from '../../artifacts/contracts/DPexRouter.sol/DPexRouter.json'
import DPexRouterPairsAbi from '../../artifacts/contracts/DPexRouterPairs.sol/DPexRouterPairs.json'
import DPexWETHWrapperAbi from '../../artifacts/contracts/DPexWETHWrapper.sol/DPexWETHWrapper.json'
import PancakeFactoryAbi from '../../artifacts/contracts/test/PancakeFactory.sol/PancakeFactory.json'
import PancakePairAbi from '../../artifacts/contracts/test/PancakeFactory.sol/PancakePair.json'

const overrides = {
  gasLimit: 9500000
}

interface V2Fixture {
  token0: IBEP20
  token1: IBEP20
  WETH: IWETH
  WETHPartner: IBEP20
  factory: DPexFactory
  pancakeFactory: PancakeFactory
  router: DPexRouter
  routerPairs: DPexRouterPairs
  pair: IDPexPair
  WETHPair: IDPexPair
  WETHWrapper: DPexWETHWrapper
  feeAggregator: FeeAggregator
}

export async function v2Fixture([wallet]: Wallet[], provider: providers.Web3Provider): Promise<V2Fixture> {
  // deploy tokens
  const tokenA = await waffle.deployContract(wallet, ERC20Abi, [expandTo18Decimals(10000)], overrides) as IBEP20
  const tokenB = await waffle.deployContract(wallet, ERC20Abi, [expandTo18Decimals(10000)], overrides) as IBEP20
  const WETH = await waffle.deployContract(wallet, WBNBAbi, [], overrides) as IWETH
  const WETHPartner = await waffle.deployContract(wallet, ERC20Abi, [expandTo18Decimals(10000)], overrides) as IBEP20

  // deploy factory
  const DPexFactory = await ethers.getContractFactory("DPexFactory");
  const factory =  await upgrades.deployProxy(DPexFactory, [wallet.address], {initializer: 'initialize'}) as DPexFactory;
  // const factory = await waffle.deployContract(wallet, DPexFactoryAbi, [], overrides) as DPexFactory
  // await factory.initialize(wallet.address, overrides);
  const pancakeFactory = await waffle.deployContract(wallet, PancakeFactoryAbi, [wallet.address], overrides) as PancakeFactory

  // deploy governance contract
  const PSIGovernance = await ethers.getContractFactory("PSIGovernance");
  const governance =  await upgrades.deployProxy(PSIGovernance, [], {initializer: 'initialize'}) as PSIGovernance;
  // const governance = await waffle.deployContract(wallet, PSIGovernanceAbi, [], overrides) as PSIGovernance
  // await governance.initialize(overrides);

  // deploy fee aggregator
  const FeeAggregator = await ethers.getContractFactory("FeeAggregator");
  const feeAggregator =  await upgrades.deployProxy(FeeAggregator, [governance.address, WETH.address, tokenA.address], {initializer: 'initialize'}) as FeeAggregator;
  // const feeAggregator = await waffle.deployContract(wallet, FeeAggregatorAbi, [], overrides) as FeeAggregator
  // await feeAggregator.initialize(governance.address, WETH.address, tokenA.address, overrides);

  // router pairs
  const DPexRouterPairs = await ethers.getContractFactory("DPexRouterPairs");
  const routerPairs = await upgrades.deployProxy(DPexRouterPairs, [feeAggregator.address, governance.address], {initializer: 'initialize'}) as DPexRouterPairs;
  await routerPairs.setFactory(factory.address, "0x8ce3d8395a2762e69b9d143e8364b606484fca5a5826adb06d61642abebe6a0f");
  await routerPairs.setFactory(pancakeFactory.address, "0xd639c7d5fee627d160978e5a35bebfee676a1d723ab8461f98800f4c15ce3fcf");

  // deploy router
  const DPexRouter = await ethers.getContractFactory("DPexRouter");
  const router =  await upgrades.deployProxy(DPexRouter, [factory.address, routerPairs.address, WETH.address, feeAggregator.address, governance.address], {initializer: 'initialize'}) as DPexRouter;
  // const router = await waffle.deployContract(wallet, DPexRouterAbi, [], overrides) as DPexRouter
  // await router.initialize(factory.address, WETH.address, feeAggregator.address, governance.address, overrides)
  await governance.setRouter(router.address, overrides);
  await feeAggregator.addFeeToken(WETH.address, overrides);
  await feeAggregator.addFeeToken(tokenA.address, overrides);

  // weth wrapper
  const WETHWrapper = await waffle.deployContract(wallet, DPexWETHWrapperAbi, [router.address, WETH.address, governance.address], overrides) as DPexWETHWrapper
  await router.setWETHWrapper(WETHWrapper.address);

  // initialize V2
  await factory.createPair(tokenA.address, tokenB.address, overrides)
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
  const pair = new Contract(pairAddress, JSON.stringify(IDPexPairAbi.abi), provider).connect(wallet) as IDPexPair
 
  const token0Address = await pair.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  await factory.createPair(WETH.address, WETHPartner.address, overrides)
  const WETHPairAddress = await factory.getPair(WETH.address, WETHPartner.address)
  const WETHPair = new Contract(WETHPairAddress, JSON.stringify(IDPexPairAbi.abi), provider).connect(wallet) as IDPexPair

  return {
    token0,
    token1,
    WETH,
    WETHPartner,
    factory,
    pancakeFactory,
    router,
    routerPairs,
    pair,
    WETHPair,
    WETHWrapper,
    feeAggregator
  }
}
