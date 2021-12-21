import chai, { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'

import { expandTo9Decimals, expandTo18Decimals, TOTAL_SUPPLY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { DPexRouter, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory } from '@passive-income/dpex-swap-core/typechain'
import { PSI, IBEP20, FeeAggregator } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaignFactory, PSIPadCampaign, PSIPadTokenDeployer }  from '../typechain'

import PSIPadCampaignAbi from '../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'
import IBEP20Abi from '@passive-income/psi-contracts/abi/contracts/interfaces/IBEP20.sol/IBEP20.json'
import { defaultAbiCoder } from '@ethersproject/abi'
import { solidityPack } from 'ethers/lib/utils'

chai.use(waffle.solidity)

describe('PSIPadCampaignFactory', () => {
  const { provider, createFixtureLoader } = waffle;
  const [ owner, user1, user2, user3 ] = provider.getWallets()
  const loadFixture = createFixtureLoader([owner], provider)

  let psi: PSI
  let token: IBEP20
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
    rate: expandTo9Decimals(100), // 1 bnb = 100 tokens
    min_allowed: expandTo18Decimals(0.1), // 0.1 bnb
    max_allowed: expandTo18Decimals(10), // 2 bnb
    pool_rate: expandTo9Decimals(60), // 1 bnb = 60 tokens (could differ from sell rate)
    lock_duration: 60, // 1 minute
    liquidity_rate: 7500, // 75%
    whitelist_enabled: false
  }

  let campaign: PSIPadCampaign;
  const addDefaultCampaign = async () => {
    poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp + 60
    poolData.end_date = poolData.start_date + 60 // 1 minute

    const tokensNeeded = await campaignFactory.tokensNeeded(poolData, 0)
    await token.approve(campaignFactory.address, tokensNeeded)
    await campaignFactory.createCampaign(poolData, token.address, 0, factory.address, router.address)
    campaign = new ethers.Contract(await campaignFactory.campaigns(0), PSIPadCampaignAbi, owner) as PSIPadCampaign
  }

  it('Default factory and router', async () => {
    expect(await campaignFactory.default_factory()).to.eq(factory.address)
    expect(await campaignFactory.default_router()).to.eq(router.address)
    expect(await campaignFactory.fee_aggregator()).to.eq(feeAggregator.address)
    expect(await campaignFactory.stable_coin()).to.eq(WETH.address)
  })

  it('Tokens needed', async () => {
    expect(await campaignFactory.tokensNeeded(poolData, 0)).to.eq(expandTo9Decimals(2914.5))
  })

  describe('Create campaign', async () => {
    beforeEach(async function() {
      poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp
      poolData.end_date = poolData.start_date + 60 // 1 minute
    })

    it('Fails when softcap is higher then hardcap', async () => {
      const finalData = { ...poolData, hardCap: expandTo18Decimals(9.99) }
      await expect(campaignFactory.createCampaign(finalData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("PSIPadLockFactory: SOFTCAP_HIGHER_THEN_HARDCAP")
    })
    it('Fails when startdate is higher then enddate', async () => {
      const finalData = { ...poolData, end_date: poolData.start_date - 1 }
      await expect(campaignFactory.createCampaign(finalData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("PSIPadLockFactory: STARTDATE_HIGHER_THEN_ENDDATE")
    })
    it('Fails when enddate is higher then current timestamp', async () => {
      const finalData = { ...poolData, start_date: poolData.start_date - 1, end_date: poolData.start_date }
      await expect(campaignFactory.createCampaign(finalData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("PSIPadLockFactory: ENDDATE_HIGHER_THEN_CURRENTDATE")
    })
    it('Fails when minimum allowed is higher then hardcap', async () => {
      const finalData = { ...poolData, min_allowed: expandTo18Decimals(20.01) }
      await expect(campaignFactory.createCampaign(finalData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("PSIPadLockFactory: MINIMUM_ALLOWED_HIGHER_THEN_HARDCAP")
    })
    it('Fails when token rate is zero', async () => {
      const finalData = { ...poolData, rate: 0 }
      await expect(campaignFactory.createCampaign(finalData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("PSIPadLockFactory: RATE_IS_ZERO")
    })
    it('Fails when liquidity rate is higher then 10000', async () => {
      const finalData = { ...poolData, liquidity_rate: 10001 }
      await expect(campaignFactory.createCampaign(finalData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("PSIPadLockFactory: LIQUIDITY_RATE_0_10000")
    })

    it('Succeeds', async () => {
      const expectedCampaignAddress = "0x56639dB16Ac50A89228026e42a316B30179A5376"
      
      await expect(campaignFactory.createCampaign(poolData, token.address, 0, factory.address, router.address))
        .to.be.revertedWith("ERC20: transfer amount exceeds allowance")

      const tokensNeeded = await campaignFactory.tokensNeeded(poolData, 0)
      await token.approve(campaignFactory.address, tokensNeeded)
      await expect(campaignFactory.createCampaign(poolData, token.address, 0, factory.address, router.address))
        .to.emit(campaignFactory, 'CampaignAdded')
        .withArgs(expectedCampaignAddress, token.address, owner.address)

      const userCampaigns = await campaignFactory.getUserCampaigns(owner.address)
      expect(userCampaigns.length).to.eq(1)
      expect(userCampaigns[0]).to.eq(0)

      const campaignAddress = await campaignFactory.campaigns(0)
      expect(campaignAddress).to.eq(expectedCampaignAddress)
      expect(await token.balanceOf(campaignAddress)).to.eq(tokensNeeded)

      const campaign = new ethers.Contract(campaignAddress, PSIPadCampaignAbi, owner) as PSIPadCampaign
      expect(await campaign.factory_address()).to.eq(factory.address)
      expect(await campaign.router_address()).to.eq(router.address)
    })
  })

  describe('Buy', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails when presale is not live yet', async () => {
      await expect(campaign.connect(user1).buyTokens()).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_NOT_LIVE")
    })
    it('Fails when amoun is below minimum amount', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(0.099) })).to.be.revertedWith("PSIPadCampaign: BELOW_MIN_AMOUNT")
    })
    it('Fails when amount is above maximum amount', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.01) })).to.be.revertedWith("PSIPadCampaign: ABOVE_MAX_AMOUNT")

      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(0.1) })).to.be.revertedWith("PSIPadCampaign: ABOVE_MAX_AMOUNT")
    })
    it('Fails when not enough remaining tokens', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await campaign.connect(user2).buyTokens({ value: expandTo18Decimals(9.00) })
      await expect(campaign.connect(user3).buyTokens({ value: expandTo18Decimals(1.01) })).to.be.revertedWith("PSIPadCampaign: CONTRACT_INSUFFICIENT_TOKENS")
      expect(await campaign.collected()).to.eq(expandTo18Decimals(19.00))
      expect(await campaign.finalized()).to.eq(false)
    })
    it('Succeeds and finalizes', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) }))
        .to.emit(campaign, 'TokensBought')
        .withArgs(user1.address, expandTo18Decimals(10.00))
      await expect(campaign.connect(user2).buyTokens({ value: expandTo18Decimals(10.00) }))
        .to.emit(campaign, 'TokensBought')
        .withArgs(user2.address, expandTo18Decimals(10.00))

      expect(await campaign.collected()).to.eq(expandTo18Decimals(20.00))
      expect(await campaign.finalized()).to.eq(true)
      expect(await provider.getBalance(campaign.address)).to.eq(expandTo18Decimals(20.00))
    })
  })

  describe('Whitelist', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails to enable when caller is not the owner', async () => {
      await expect(campaign.connect(user1).setWhitelistEnabled(true)).to.be.revertedWith("PSIPadCampaign: UNAUTHORIZED")
      await expect(campaign.connect(user1).addWhitelist('0x', true)).to.be.revertedWith("PSIPadCampaign: UNAUTHORIZED")
    })
    it('Succeeds', async () => {
      await campaign.setWhitelistEnabled(true)
      let data = solidityPack(["address"], [user1.address])
      data += solidityPack(["address"], [user2.address]).substr(2)
      await campaign.addWhitelist(data, true)

      expect(await campaign.whitelisted(user1.address)).to.eq(true)
      expect(await campaign.whitelisted(user2.address)).to.eq(true)
    })
  })

  describe('Buy with whitelist', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()

      await campaign.setWhitelistEnabled(true)
      let data = solidityPack(["address"], [user1.address])
      data += solidityPack(["address"], [user2.address]).substr(2)
      await campaign.addWhitelist(data, true)
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
    })
    it('Fails when not whitelisted', async () => {
      await expect(campaign.connect(user3).buyTokens({ value: expandTo18Decimals(10.00) }))
        .to.be.revertedWith("PSIPadCampaign: NOT_WHITELISTED")
    })
    it('Succeeds and finalized', async () => {
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await campaign.connect(user2).buyTokens({ value: expandTo18Decimals(10.00) })
      expect(await campaign.collected()).to.eq(expandTo18Decimals(20.00))
      expect(await campaign.finalized()).to.eq(true)
      expect(await provider.getBalance(campaign.address)).to.eq(expandTo18Decimals(20.00))
    })
  })

  describe('Lock', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails when campaign has not started yet', async () => {
      await expect(campaignFactory.lock(0)).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_NOT_STARTED")
    })
    it('Fails when campaign does not exist', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.lock(1)).to.be.revertedWith("PSIPadCampaignFactory: CAMPAIGN_DOES_NOT_EXIST")
    })
    it('Fails when user is not the owner', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.connect(user1).lock(0)).to.be.revertedWith("PSIPadCampaignFactory: UNAUTHORIZED")
    })
    it('Fails when campaign is still live', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.lock(0)).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_STILL_LIVE")
    })
    it('Fails when the campaign has failed (e.g. soft cap not reached)', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaignFactory.lock(0)).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_FAILED")
    })
    it('Fails when lock is called straight on the campaign contract', async () => {
      await expect(campaign.lock()).to.be.revertedWith("PSIPadCampaign: UNAUTHORIZED")
    })
    it('Succeeds with hardcap reached', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await campaign.connect(user2).buyTokens({ value: expandTo18Decimals(10.00) })

      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date + 30])
      await expect(campaignFactory.lock(0))
        .to.emit(campaignFactory, 'CampaignLocked')
        .withArgs(campaign.address, token.address, expandTo18Decimals(20.00))
        .to.emit(campaign, 'CampaignLocked')
        .withArgs(expandTo18Decimals(20.00))

      expect(await campaign.locked()).to.eq(true)
      expect(await campaign.unlock_date()).to.eq(poolData.start_date + 30 + poolData.lock_duration)

      expect(await WETH.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(0.2))
      expect(await token.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(14.5))

      const pairAddress = await factory.getPair(WETH.address, token.address);
      const pair = new ethers.Contract(pairAddress, IBEP20Abi, owner) as IBEP20
      expect(await campaign.lp_address()).to.eq(pairAddress)
      expect(await WETH.balanceOf(pairAddress)).to.eq(expandTo18Decimals(15))
      expect(await token.balanceOf(pairAddress)).to.eq(expandTo9Decimals(900))
      expect(await token.balanceOf(campaign.address)).to.eq(expandTo9Decimals(2000))
      expect(await pair.balanceOf(campaign.address)).to.eq(BigNumber.from('116189500386222505555'))
    })

    it('Succeeds with softcap reached', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaignFactory.lock(0))
        .to.emit(campaignFactory, 'CampaignLocked')
        .withArgs(campaign.address, token.address, expandTo18Decimals(10.00))
        .to.emit(campaign, 'CampaignLocked')
        .withArgs(expandTo18Decimals(10.00))

      expect(await campaign.locked()).to.eq(true)
      expect(await campaign.unlock_date()).to.eq(poolData.end_date + 1 + poolData.lock_duration)

      expect(await WETH.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(0.1))
      expect(await token.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(7.25))

      const pairAddress = await factory.getPair(WETH.address, token.address);
      const pair = new ethers.Contract(pairAddress, IBEP20Abi, owner) as IBEP20
      expect(await campaign.lp_address()).to.eq(pairAddress)
      expect(await WETH.balanceOf(pairAddress)).to.eq(expandTo18Decimals(7.5))
      expect(await token.balanceOf(pairAddress)).to.eq(expandTo9Decimals(450))
      expect(await token.balanceOf(campaign.address)).to.eq(expandTo9Decimals(2457.25))
      expect(await pair.balanceOf(campaign.address)).to.eq(BigNumber.from('58094750193111252277'))
    })
  })

  describe('Unlock', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails when called straight on the campaign contract', async () => {
      await expect(campaign.unlock()).to.be.revertedWith("PSIPadCampaign: UNAUTHORIZED")
    })
    it('Fails when campaign does not exist', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.unlock(1)).to.be.revertedWith("PSIPadCampaignFactory: CAMPAIGN_DOES_NOT_EXIST")
    })
    it('Fails when user is not the owner', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.connect(user1).unlock(0)).to.be.revertedWith("PSIPadCampaignFactory: UNAUTHORIZED")
    })
    it('Fails when campaign is not locked or has not failed', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_LOCKED")
      
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(9.99) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_LOCKED")
    })
    it('Fails when lock had not ended yet', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: TOKENS_ARE_LOCKED")

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + poolData.lock_duration])
      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: TOKENS_ARE_LOCKED")
    })
    it('Succeeds', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      const tokenBalance = await token.balanceOf(owner.address)
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1 + poolData.lock_duration])
      await expect(campaignFactory.unlock(0))
        .to.emit(campaignFactory, 'CampaignUnlocked')
        .withArgs(campaign.address, token.address)
        .to.emit(campaign, 'CampaignUnlocked')

      const pairAddress = await factory.getPair(WETH.address, token.address);
      const pair = new ethers.Contract(pairAddress, IBEP20Abi, owner) as IBEP20

      expect(await token.balanceOf(owner.address)).to.eq(tokenBalance.add(expandTo9Decimals(2457.25)))
      expect(await token.balanceOf(campaign.address)).to.eq(0)
      expect(await provider.getBalance(campaign.address)).to.eq(0)
      expect(await pair.balanceOf(owner.address)).to.eq(BigNumber.from('58094750193111252277'))
      expect(await pair.balanceOf(campaign.address)).to.eq(0)
    })
  })

  describe('LP address change', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails when user is not the owner', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.connect(user1).setLPAddress(token.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })
    it('Fails when campaign is not locked or has not failed', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.setLPAddress(token.address)).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_LOCKED")
      
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(9.99) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaign.setLPAddress(token.address)).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_LOCKED")
    })
    it('Fails when lock had not ended yet', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      await expect(campaign.setLPAddress(token.address)).to.be.revertedWith("PSIPadCampaign: TOKENS_ARE_LOCKED")

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + poolData.lock_duration])
      await expect(campaign.setLPAddress(token.address)).to.be.revertedWith("PSIPadCampaign: TOKENS_ARE_LOCKED")
    })
    it('Succeeds', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1 + poolData.lock_duration])
      await campaign.setLPAddress(token.address)
      expect(await campaign.lp_address()).to.eq(token.address)
    })
  })

  describe('Withdraw tokens', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails when tokens are not locked yet', async () => {
      await expect(campaign.connect(user1).withdrawTokens()).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_ADDED")

      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await expect(campaign.connect(user1).withdrawTokens()).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_ADDED")

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaign.connect(user1).withdrawTokens()).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_ADDED")
      await campaignFactory.lock(0)
    })
    it('Fails when not a participant', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)
      await expect(campaign.connect(user2).withdrawTokens()).to.be.revertedWith("PSIPadCampaign: NO_PARTICIPANT")
    })
    it('Succeeds', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      await campaign.connect(user1).withdrawTokens();
      expect(await token.balanceOf(user1.address)).to.eq(expandTo9Decimals(1000))
    })
  })

  describe('Withdraw funds', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Fails when not failed or refunded', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      await expect(campaign.connect(user1).withdrawFunds()).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_NOT_FAILED")
    })
    it('Only gas used when not a participant', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(9.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])

      const balance = await provider.getBalance(user2.address);
      const receipt = await (await campaign.connect(user2).withdrawFunds()).wait()
      const etherUsed = receipt.effectiveGasPrice.mul(receipt.gasUsed)
      expect(await provider.getBalance(user2.address)).to.eq(balance.sub(etherUsed))
    })
    it('Succeeds when failed', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(9.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])

      const balance = await provider.getBalance(user1.address);
      const receipt = await (await campaign.connect(user1).withdrawFunds()).wait()
      const etherUsed = receipt.effectiveGasPrice.mul(receipt.gasUsed)
      expect(await provider.getBalance(user1.address)).to.eq(balance.add(expandTo18Decimals(9)).sub(etherUsed))
    })
    it('Succeeds when refunded', async () => {
      await token.approve(router.address, expandTo18Decimals(1))
      await router.addLiquidityETH (
        token.address,
        expandTo18Decimals(1),
        0,
        0,
        owner.address,
        (await provider.getBlock(provider.blockNumber)).timestamp + 60,
        { value: expandTo18Decimals(0.1) }
      );
      
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)
      
      const balance = await provider.getBalance(user1.address);
      const receipt = await (await campaign.connect(user1).withdrawFunds()).wait()
      const etherUsed = receipt.effectiveGasPrice.mul(receipt.gasUsed)
      expect(await provider.getBalance(user1.address)).to.eq(balance.add(expandTo18Decimals(10)).sub(etherUsed))
    })
    it('Succeeds for owner when retrieving tokens when failed ', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(9.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])

      const balance = await provider.getBalance(owner.address);
      const receipt = await (await campaign.connect(owner).withdrawFunds()).wait()
      const etherUsed = receipt.effectiveGasPrice.mul(receipt.gasUsed)
      expect(await provider.getBalance(owner.address)).to.eq(balance.sub(etherUsed))
      expect(await token.balanceOf(owner.address)).to.eq(TOTAL_SUPPLY)
    })
  })
})
