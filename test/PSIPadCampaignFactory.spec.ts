import chai, { expect } from 'chai'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { DPexRouter, DPexRouterPairs, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory } from '@passive-income/dpex-swap-core/typechain'
import { PSI, IBEP20, FeeAggregator, IBEP20__factory } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaignFactory, PSIPadCampaign, PSIPadTokenDeployer, TestBEP20 }  from '../typechain'

import PSIPadCampaignAbi from '../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'
import IBEP20Abi from '@passive-income/psi-contracts/abi/contracts/interfaces/IBEP20.sol/IBEP20.json'

chai.use(waffle.solidity)

const overrides = {
  gasLimit: 9500000
}

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
    rate: expandTo18Decimals(100), // 1 bnb = 100 tokens
    min_allowed: expandTo18Decimals(0.1), // 0.1 bnb
    max_allowed: expandTo18Decimals(10), // 2 bnb
    pool_rate: expandTo18Decimals(60), // 1 bnb = 60 tokens (could differ from sell rate)
    lock_duration: 60, // 1 minute
    liquidity_rate: 7500 // 75%
  }

  let campaign: PSIPadCampaign;
  const addDefaultCampaign = async () => {
    poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp + 60
    poolData.end_date = poolData.start_date + 60 // 1 minute

    const tokensNeeded = await campaignFactory.tokensNeeded(poolData, 0)
    await token.approve(campaignFactory.address, tokensNeeded)
    await campaignFactory.createCampaign(poolData, token.address, 0)
    campaign = new ethers.Contract(await campaignFactory.campaigns(0), PSIPadCampaignAbi, owner) as PSIPadCampaign
  }

  it('Default factory and router', async () => {
    expect(await campaignFactory.default_factory()).to.eq(factory.address)
    expect(await campaignFactory.default_router()).to.eq(router.address)
    expect(await campaignFactory.fee_aggregator()).to.eq(feeAggregator.address)
    expect(await campaignFactory.stable_coin()).to.eq(WETH.address)
  })

  it('Tokens needed', async () => {
    expect(await campaignFactory.tokensNeeded(poolData, 0)).to.eq(expandTo18Decimals(2914.5))
  })

  describe('Create campaign', async () => {
    beforeEach(async function() {
      poolData.start_date = (await provider.getBlock(provider.blockNumber)).timestamp
      poolData.end_date = poolData.start_date + 60 // 1 minute
    })

    // require(_data.softCap < _data.hardCap, "PSIPadLockFactory: SOFTCAP_HIGHER_THEN_LOWCAP" );
    // require(_data.start_date < _data.end_date, "PSIPadLockFactory: STARTDATE_HIGHER_THEN_ENDDATE" );
    // require(block.timestamp < _data.end_date, "PSIPadLockFactory: ENDDATE_HIGHER_THEN_CURRENTDATE");
    // require(_data.min_allowed < _data.hardCap, "PSIPadLockFactory: MINIMUM_ALLOWED_HIGHER_THEN_HARDCAP" );
    // require(_data.rate != 0, "PSIPadLockFactory: RATE_IS_ZERO");
    // require(_data.liquidity_rate >= 0 && _data.liquidity_rate <= 10000);
    // require(
    //   IERC20Upgradeable(_token).balanceOf(campaign_address) >= tokensNeeded(_data, _tokenFeePercentage), 
    //   "PSIPadLockFactory: CAMPAIGN_TOKEN_AMOUNT_TO_LOW"
    // );

    it('Succeeds', async () => {
      const expectedTokenAddress = "0x3E1033d959ba24109C1A80564108b5673358a235"
      
      await expect(campaignFactory.createCampaign(poolData, token.address, 0))
        .to.be.revertedWith("ERC20: transfer amount exceeds allowance")

      const tokensNeeded = await campaignFactory.tokensNeeded(poolData, 0)
      await token.approve(campaignFactory.address, tokensNeeded)
      await expect(campaignFactory.createCampaign(poolData, token.address, 0))
        .to.emit(campaignFactory, 'CampaignAdded')
        .withArgs(expectedTokenAddress, token.address, owner.address)

      const userCampaigns = await campaignFactory.getUserCampaigns(owner.address)
      expect(userCampaigns.length).to.eq(1)
      expect(userCampaigns[0]).to.eq(0)

      const campaignAddress = await campaignFactory.campaigns(0)
      expect(campaignAddress).to.eq(expectedTokenAddress)
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

    it('Buy: Presale not live yet', async () => {
      await expect(campaign.connect(user1).buyTokens()).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_NOT_LIVE")
    })
    it('Buy: Below minimum amount', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(0.099) })).to.be.revertedWith("PSIPadCampaign: BELOW_MIN_AMOUNT")
    })
    it('Buy: Above maximum amount', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.01) })).to.be.revertedWith("PSIPadCampaign: ABOVE_MAX_AMOUNT")

      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await expect(campaign.connect(user1).buyTokens({ value: expandTo18Decimals(0.1) })).to.be.revertedWith("PSIPadCampaign: ABOVE_MAX_AMOUNT")
    })
    it('Buy: Not enough remaining tokens', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await campaign.connect(user2).buyTokens({ value: expandTo18Decimals(9.00) })
      await expect(campaign.connect(user3).buyTokens({ value: expandTo18Decimals(1.01) })).to.be.revertedWith("PSIPadCampaign: CONTRACT_INSUFFICIENT_TOKENS")
      expect(await campaign.collected()).to.eq(expandTo18Decimals(19.00))
      expect(await campaign.finalized()).to.eq(false)
    })
    it('Buy: Succeeds and finalizes', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
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

    it('Lock: Fails when campaign has not started yet', async () => {
      await expect(campaignFactory.lock(0)).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_NOT_STARTED")
    })
    it('Lock: Fails when campaign does not exist', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.lock(1)).to.be.revertedWith("PSIPadCampaignFactory: CAMPAIGN_DOES_NOT_EXIST")
    })
    it('Lock: Fails when user is not the owner', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.connect(user1).lock(0)).to.be.revertedWith("PSIPadCampaignFactory: UNAUTHORIZED")
    })
    it('Lock: Fails when campaign is still live', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.lock(0)).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_STILL_LIVE")
    })
    it('Lock: Fails when the campaign has failed (e.g. soft cap not reached)', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaignFactory.lock(0)).to.be.revertedWith("PSIPadCampaign: CAMPAIGN_FAILED")
    })
    it('Lock: Fails when lock is called straight on the campaign contract', async () => {
      await expect(campaign.lock()).to.be.revertedWith("PSIPadCampaign: UNAUTHORIZED")
    })
    it('Lock: Succeeds with hardcap reached', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await campaign.connect(user2).buyTokens({ value: expandTo18Decimals(10.00) })

      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date + 30])
      await campaignFactory.lock(0)
      expect(await campaign.locked()).to.eq(true)
      expect(await campaign.unlock_date()).to.eq(poolData.start_date + 30 + poolData.lock_duration)

      expect(await WETH.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(0.2))
      expect(await token.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(14.5))

      const pairAddress = await factory.getPair(WETH.address, token.address);
      const pair = new ethers.Contract(pairAddress, IBEP20Abi, owner) as IBEP20
      expect(await campaign.lp_address()).to.eq(pairAddress)
      expect(await WETH.balanceOf(pairAddress)).to.eq(expandTo18Decimals(15))
      expect(await token.balanceOf(pairAddress)).to.eq(expandTo18Decimals(900))
      expect(await token.balanceOf(campaign.address)).to.eq(expandTo18Decimals(2000))
      expect(await pair.balanceOf(campaign.address)).to.eq(BigNumber.from('116189500386222505555'))
    })

    it('Lock: Succeeds with softcap reached', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)
      expect(await campaign.locked()).to.eq(true)
      expect(await campaign.unlock_date()).to.eq(poolData.end_date + 1 + poolData.lock_duration)

      expect(await WETH.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(0.1))
      expect(await token.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(7.25))

      const pairAddress = await factory.getPair(WETH.address, token.address);
      const pair = new ethers.Contract(pairAddress, IBEP20Abi, owner) as IBEP20
      expect(await campaign.lp_address()).to.eq(pairAddress)
      expect(await WETH.balanceOf(pairAddress)).to.eq(expandTo18Decimals(7.5))
      expect(await token.balanceOf(pairAddress)).to.eq(expandTo18Decimals(450))
      expect(await token.balanceOf(campaign.address)).to.eq(expandTo18Decimals(2457.25))
      expect(await pair.balanceOf(campaign.address)).to.eq(BigNumber.from('58094750193111252277'))
    })
  })

  describe('Unlock', async () => {
    beforeEach(async function() {
      await addDefaultCampaign()
    })

    it('Unlock: Fails when called straight on the campaign contract', async () => {
      await expect(campaign.unlock()).to.be.revertedWith("PSIPadCampaign: UNAUTHORIZED")
    })
    it('Unlock: Fails when campaign does not exist', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.unlock(1)).to.be.revertedWith("PSIPadCampaignFactory: CAMPAIGN_DOES_NOT_EXIST")
    })
    it('Unlock: Fails when user is not the owner', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.connect(user1).unlock(0)).to.be.revertedWith("PSIPadCampaignFactory: UNAUTHORIZED")
    })
    it('Unlock: Fails when campaign is not locked or has not failed', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_LOCKED")
      
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(9.99) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: LIQUIDITY_NOT_LOCKED")
    })
    it('Unlock: Fails when lock had not ended yet', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: TOKENS_ARE_LOCKED")

      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + poolData.lock_duration])
      await expect(campaignFactory.unlock(0)).to.be.revertedWith("PSIPadCampaign: TOKENS_ARE_LOCKED")
    })
    it('Unlock: Succeeds', async () => {
      await provider.send("evm_setNextBlockTimestamp", [poolData.start_date])
      await campaign.connect(user1).buyTokens({ value: expandTo18Decimals(10.00) })
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1])
      await campaignFactory.lock(0)

      const tokenBalance = await token.balanceOf(owner.address)
      await provider.send("evm_setNextBlockTimestamp", [poolData.end_date + 1 + poolData.lock_duration])
      await campaignFactory.unlock(0)

      const pairAddress = await factory.getPair(WETH.address, token.address);
      const pair = new ethers.Contract(pairAddress, IBEP20Abi, owner) as IBEP20

      expect(await token.balanceOf(owner.address)).to.eq(tokenBalance.add(expandTo18Decimals(2457.25)))
      expect(await token.balanceOf(campaign.address)).to.eq(0)
      expect(await provider.getBalance(campaign.address)).to.eq(0)
      expect(await pair.balanceOf(owner.address)).to.eq(BigNumber.from('58094750193111252277'))
      expect(await pair.balanceOf(campaign.address)).to.eq(0)
    })
  })
})
