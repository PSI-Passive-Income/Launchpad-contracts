import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'

import { expandTo18Decimals, TOTAL_SUPPLY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { DPexRouter, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory } from '@passive-income/dpex-swap-core/typechain'
import { PSI, IBEP20 } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaignFactory, PSIPadCampaign, PSIPadTokenDeployer }  from '../typechain'

import PSIPadCampaignAbi from '../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'
import IBEP20Abi from '@passive-income/psi-contracts/abi/contracts/interfaces/IBEP20.sol/IBEP20.json'

chai.use(waffle.solidity)

describe('PSITokenDeployer', () => {
  const { provider, createFixtureLoader } = waffle;
  const [ owner ] = provider.getWallets()
  const loadFixture = createFixtureLoader([owner], provider)

  let psi: PSI
  let token: IBEP20
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
    max_allowed: expandTo18Decimals(10), // 2 bnb
    pool_rate: expandTo18Decimals(60), // 1 bnb = 60 tokens (could differ from sell rate)
    lock_duration: 60, // 1 minute
    liquidity_rate: 7500 // 75%
  }

  it('Default campaign factory', async () => {
    expect(await tokenDeployer.campaignFactory()).to.eq(campaignFactory.address)
  })

  describe('Create campaign', async () => {
    const expectedCampaignAddress = "0x9B9DE65855B61Ee3E67c22D4467019f401AE7AE9"
    const expectedTokenAddress = "0x029A593bd3e0a3bcC01f5F69d36F6835D5686cb9"

    beforeEach(async function() {
      poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp
      poolData.end_date = poolData.start_date + 60 // 1 minute
    })

    it('Fails when softcap is higher then hardcap', async () => {
      const finalData = { ...poolData, hardCap: expandTo18Decimals(9.99) }
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, finalData)).to.be.revertedWith("PSIPadLockFactory: SOFTCAP_HIGHER_THEN_HARDCAP")
    })
    it('Fails when startdate is higher then enddate', async () => {
      const finalData = { ...poolData, end_date: poolData.start_date - 1 }
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, finalData)).to.be.revertedWith("PSIPadLockFactory: STARTDATE_HIGHER_THEN_ENDDATE")
    })
    it('Fails when enddate is higher then current timestamp', async () => {
      const finalData = { ...poolData, start_date: poolData.start_date - 1, end_date: poolData.start_date }
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, finalData)).to.be.revertedWith("PSIPadLockFactory: ENDDATE_HIGHER_THEN_CURRENTDATE")
    })
    it('Fails when minimum allowed is higher then hardcap', async () => {
      const finalData = { ...poolData, min_allowed: expandTo18Decimals(20.01) }
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, finalData)).to.be.revertedWith("PSIPadLockFactory: MINIMUM_ALLOWED_HIGHER_THEN_HARDCAP")
    })
    it('Fails when token rate is zero', async () => {
      const finalData = { ...poolData, rate: 0 }
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, finalData)).to.be.revertedWith("PSIPadLockFactory: RATE_IS_ZERO")
    })
    it('Fails when liquidity rate is higher then 10000', async () => {
      const finalData = { ...poolData, liquidity_rate: 10001 }
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, finalData)).to.be.revertedWith("PSIPadLockFactory: LIQUIDITY_RATE_0_10000")
    })

    it('Succeeds', async () => {
      const tokensNeeded = await campaignFactory.tokensNeeded(poolData, 0)
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", TOTAL_SUPPLY, poolData))
        .to.emit(tokenDeployer, 'TokenCreated')
        .withArgs(expectedTokenAddress, "Test Token", "TT", TOTAL_SUPPLY)
        .to.emit(campaignFactory, 'CampaignAdded')
        .withArgs(expectedCampaignAddress, expectedTokenAddress, owner.address)

      const userCampaigns = await campaignFactory.getUserCampaigns(owner.address)
      expect(userCampaigns.length).to.eq(1)
      expect(userCampaigns[0]).to.eq(0)

      const newToken = new ethers.Contract(expectedTokenAddress, IBEP20Abi, owner) as IBEP20
      const campaignAddress = await campaignFactory.campaigns(0)
      expect(campaignAddress).to.eq(expectedCampaignAddress)
      expect(await newToken.balanceOf(campaignAddress)).to.eq(tokensNeeded)

      const campaign = new ethers.Contract(campaignAddress, PSIPadCampaignAbi, owner) as PSIPadCampaign
      expect(await campaign.factory_address()).to.eq(factory.address)
      expect(await campaign.router_address()).to.eq(router.address)
    })

    it('Fails when too few tokens created', async () => {
      const tokensNeeded = await campaignFactory.tokensNeeded(poolData, 0)
      await expect(tokenDeployer.createTokenWithCampaign("Test Token", "TT", tokensNeeded.sub(1), poolData))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })
  })
})
