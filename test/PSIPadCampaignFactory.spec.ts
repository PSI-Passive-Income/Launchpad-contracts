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
  let factory: DPexFactory
  let router: DPexRouter
  let campaignFactory: PSIPadCampaignFactory
  let tokenDeployer: PSIPadTokenDeployer
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    psi = fixture.psi
    token = fixture.token
    WETH = fixture.WETH
    factory = fixture.factory
    router = fixture.router
    campaignFactory = fixture.campaignFactory
    tokenDeployer = fixture.tokenDeployer
  })

  // afterEach(async function() {
  //   expect(await provider.getBalance(router.address)).to.eq(constants.Zero)
  // })

  it('Default factory and router', async () => {
    expect(await campaignFactory.default_factory()).to.eq(factory.address)
    expect(await campaignFactory.default_router()).to.eq(router.address)
  })

  it('Default factory and router', async () => {
    // _softCap,_hardCap,_start_date, _end_date,_rate,_min_allowed,_max_allowed
    const startTime = (await provider.getBlock(provider.blockNumber)).timestamp
    const endTime = startTime + 1000
    const data: BigNumberish[] = [
      expandTo18Decimals(10), // 10 bnb
      expandTo18Decimals(20), // 20 bnb
      startTime,
      endTime,
      100, // 1 bnb = 100 tokens
      
    ]
    expect(await campaignFactory.createCampaign()).to.eq(factory.address)
    expect(await campaignFactory.default_router()).to.eq(router.address)
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
