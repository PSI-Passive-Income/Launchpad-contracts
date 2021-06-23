import chai, { expect } from 'chai'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { DPexRouter, DPexRouterPairs, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory } from '@passive-income/dpex-swap-core/typechain'
import { PSI, PSIGovernance, FeeAggregator } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaignFactory, PSIPadTokenDeployer, TestBEP20 }  from '../typechain'

chai.use(waffle.solidity)

const overrides = {
  gasLimit: 9500000
}

describe('PSIPadCampaignFactory', () => {
  const { provider, createFixtureLoader } = waffle;
  const [owner,user] = provider.getWallets()
  const loadFixture = createFixtureLoader([owner], provider)

  let psi: PSI
  let token: TestBEP20
  let WETH: IWETH
  let feeAggregator: FeeAggregator
  let factory: DPexFactory
  let router: DPexRouter
  let campaignFactory: PSIPadCampaignFactory
  let tokenDeployer: PSIPadTokenDeployer
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    psi = fixture.psi
    token = fixture.token
    WETH = fixture.WETH
    feeAggregator = fixture.feeAggregator
    factory = fixture.factory
    router = fixture.router
    campaignFactory = fixture.campaignFactory
    tokenDeployer = fixture.tokenDeployer
  })

  const poolData = {
    softCap: expandTo18Decimals(10), // 10 bnb
    hardCap: expandTo18Decimals(20), // 20 bnb
    start_date: 0,
    end_date: 0,
    rate: expandTo18Decimals(100), // 1 bnb = 100 tokens
    min_allowed: expandTo18Decimals(0.1), // 0.1 bnb
    max_allowed: expandTo18Decimals(2), // 2 bnb
    pool_rate: expandTo18Decimals(60), // 1 bnb = 60 tokens (could differ from sell rate)
    lock_duration: 60, // 1 minute
    liquidity_rate: 7500 // 75%
  }

  // afterEach(async function() {
  //   expect(await provider.getBalance(router.address)).to.eq(constants.Zero)
  // })

  it('Default factory and router', async () => {
    expect(await campaignFactory.default_factory()).to.eq(factory.address)
    expect(await campaignFactory.default_router()).to.eq(router.address)
    expect(await campaignFactory.fee_aggregator()).to.eq(feeAggregator.address)
    expect(await campaignFactory.stable_coin()).to.eq(WETH.address)
  })

  it('Tokens needed', async () => {
    poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp
    poolData.end_date = poolData.start_date + 60 // 1 minute
    
    expect(await campaignFactory.tokensNeeded(poolData, 0)).to.eq(expandTo18Decimals(2900));
  })

  it('Create campaign', async () => {
    poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp
    poolData.end_date = poolData.start_date + 60 // 1 minute
    
    await campaignFactory.createCampaign(poolData, token.address, 0);
  })

  // it('addLiquidity', async () => {
  //   const token0Amount = expandTo18Decimals(1)
  //   const token1Amount = expandTo18Decimals(4)

  //   const expectedLiquidity = expandTo18Decimals(2)
  //   await token0.approve(router.address, constants.MaxUint256)
  //   await token1.approve(router.address, constants.MaxUint256)
  //   await expect(
  //     router.addLiquidity(
  //       token0.address,
  //       token1.address,
  //       token0Amount,
  //       token1Amount,
  //       0,
  //       0,
  //       owner.address,
  //       constants.MaxUint256,
  //       overrides
  //     )
  //   )
  //     .to.emit(token0, 'Transfer')
  //     .withArgs(owner.address, pair.address, token0Amount)
  //     .to.emit(token1, 'Transfer')
  //     .withArgs(owner.address, pair.address, token1Amount)
  //     .to.emit(pair, 'Transfer')
  //     .withArgs(constants.Zero, constants.Zero, MINIMUM_LIQUIDITY)
  //     .to.emit(pair, 'Transfer')
  //     .withArgs(constants.Zero, owner.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
  //     .to.emit(pair, 'Sync')
  //     .withArgs(token0Amount, token1Amount)
  //     .to.emit(pair, 'Mint')
  //     .withArgs(router.address, token0Amount, token1Amount)

  //   expect(await pair.balanceOf(owner.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
  // })
})
