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

describe('PSITokenDeployer', () => {
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

  const poolData = {
    softCap: expandTo18Decimals(10), // 10 bnb
    hardCap: expandTo18Decimals(20), // 20 bnb
    start_date: 0,
    end_date: 0,
    rate: expandTo18Decimals(100), // 1 bnb = 100 tokens
    min_allowed: expandTo18Decimals(0.1), // 0.1 bnb
    max_allowed: expandTo18Decimals(2), // 2 bnb
    pool_rate: expandTo18Decimals(100), // 1 bnb = 60 tokens (could differ from sell rate)
    lock_duration: 60, // 1 minute
    liquidity_rate: 7500 // 75%
  }

  it('Default campaign factory', async () => {
    expect(await tokenDeployer.campaignFactory()).to.eq(campaignFactory.address)
  })
})
