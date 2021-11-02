import chai, { expect } from 'chai'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { ecsign } from 'ethereumjs-util'

import { expandTo9Decimals, expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { DPexRouter, IWETH } from '@passive-income/dpex-peripheral/typechain'
import { DPexFactory } from '@passive-income/dpex-swap-core/typechain'
import { PSI, IBEP20, FeeAggregator } from '@passive-income/psi-contracts/typechain'
import { PSIPadCampaignFactory, PSIPadCampaign, PSIPadTokenDeployer, PSIPadTokenLockFactory }  from '../typechain'

import PSIPadCampaignAbi from '../abi/contracts/PSIPadCampaign.sol/PSIPadCampaign.json'
import IBEP20Abi from '@passive-income/psi-contracts/abi/contracts/interfaces/IBEP20.sol/IBEP20.json'

chai.use(waffle.solidity)

describe('PSIPadTokenLockFactory', () => {
  const { provider, createFixtureLoader } = waffle;
  const [owner, user1] = provider.getWallets()
  const loadFixture = createFixtureLoader([owner], provider)

  let startTime: number;
  let amount: BigNumber = expandTo9Decimals(5000);

  let psi: PSI
  let token: IBEP20
  let WETH: IWETH
  let feeAggregator: FeeAggregator
  let tokenLockFactory: PSIPadTokenLockFactory
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    psi = fixture.psi
    token = fixture.token
    WETH = fixture.WETH
    feeAggregator = fixture.feeAggregator
    tokenLockFactory = fixture.tokenLockFactory
  })

  it('Default factory and router', async () => {
    expect(await tokenLockFactory.fee_aggregator()).to.eq(feeAggregator.address)
    expect(await tokenLockFactory.stable_coin()).to.eq(WETH.address)
  })

  describe('Lock token', async () => {
    beforeEach(async function() {
      startTime = (await provider.getBlock(provider.blockNumber)).timestamp
    })

    it('Fails when softcap is higher then hardcap', async () => {
      await expect(tokenLockFactory.lock(token.address, 0, startTime, 60, 1)).to.be.revertedWith("PSIPadTokenLockFactory: AMOUNT_ZERO")
    })
    it('Fails when the fee is not payed', async () => {
      await expect(tokenLockFactory.lock(token.address, amount, startTime, 60, 1)).to.be.revertedWith("PSIPadTokenLockFactory: FEE_NOT_PAYED")
    })
    it('Fails there are less then 1 releases', async () => {
      await expect(tokenLockFactory.lock(token.address, amount, startTime, 60, 0, { value: expandTo18Decimals(0.2) }))
        .to.be.revertedWith("PSIPadTokenLockFactory: NO_RELEASES")
    })

    it('Succeeds', async () => {
      await expect(tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) }))
        .to.be.revertedWith("ERC20: transfer amount exceeds allowance")

      await token.approve(tokenLockFactory.address, amount)
      await expect(tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) }))
        .to.emit(tokenLockFactory, 'TokenLocked')
        .withArgs(0, token.address, owner.address, amount)

      const userCampaigns = await tokenLockFactory.getUserLocks(owner.address)
      expect(userCampaigns.length).to.eq(1)
      expect(userCampaigns[0]).to.eq(0)

      const lock = await tokenLockFactory.tokensLocked(0)
      expect(lock.owner).to.eq(owner.address)
      expect(lock.token).to.eq(token.address)
      expect(lock.amount).to.eq(amount)
      expect(lock.start_time).to.eq(startTime)
      expect(lock.duration).to.eq(60)
      expect(lock.releases).to.eq(1)
      expect(await token.balanceOf(tokenLockFactory.address)).to.eq(amount)

      expect(await WETH.balanceOf(feeAggregator.address)).to.eq(expandTo18Decimals(0.2))
    })
  })

  describe('Unlock token', async () => {
    beforeEach(async function() {
      startTime = (await provider.getBlock(provider.blockNumber)).timestamp
    })

    it('Fails when campaign does not exist', async () => {
      await expect(tokenLockFactory.unlock(1, amount)).to.be.revertedWith("PSIPadTokenLockFactory: LOCK_DOES_NOT_EXIST")
    })
    it('Fails when user is not the owner', async () => {
      await token.approve(tokenLockFactory.address, amount)
      await tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) })
      await expect(tokenLockFactory.connect(user1).unlock(0, amount)).to.be.revertedWith("PSIPadTokenLockFactory: UNAUTHORIZED")
    })
    it('Fails when softcap is higher then hardcap', async () => {
      await token.approve(tokenLockFactory.address, amount)
      await tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) })
      await expect(tokenLockFactory.unlock(0, amount)).to.be.revertedWith("PSIPadTokenLockFactory: AMOUNT_TO_HIGH_OR_LOCKED")
    })

    it('Succeeds with a single unlock', async () => {
      await token.approve(tokenLockFactory.address, amount)
      await tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) })
      expect(await tokenLockFactory.unlockedAmount(0)).to.eq(0)
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq(0)
      
      await mineBlock(startTime + 60)
      expect(await tokenLockFactory.unlockedAmount(0)).to.eq(amount)
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq(amount)
      await expect(tokenLockFactory.unlock(0, amount))
        .to.emit(tokenLockFactory, 'TokenUnlocked')
        .withArgs(0, token.address, amount)
    })

    it('Succeeds with multiple unlocks', async () => {
      await token.approve(tokenLockFactory.address, amount)
      await tokenLockFactory.lock(token.address, amount, startTime, 60, 4, { value: expandTo18Decimals(0.2) })
      expect(await tokenLockFactory.unlockedAmount(0)).to.eq(0)
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq(0)
      
      await mineBlock(startTime + 15)
      expect(await tokenLockFactory.unlockedAmount(0)).to.eq(amount.div(4))
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq(amount.div(4))
      await expect(tokenLockFactory.unlockAvailable(0))
        .to.emit(tokenLockFactory, 'TokenUnlocked')
        .withArgs(0, token.address, amount.div(4))

      await mineBlock(startTime + 30)
      expect(await tokenLockFactory.unlockedAmount(0)).to.eq((amount.div(4)).mul(2))
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq(amount.div(4))
      await expect(tokenLockFactory.unlock(0, amount.div(4)))
        .to.emit(tokenLockFactory, 'TokenUnlocked')
        .withArgs(0, token.address, amount.div(4))

      await mineBlock(startTime + 60)
      expect(await tokenLockFactory.unlockedAmount(0)).to.eq(amount)
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq((amount.div(4)).mul(2))
      await expect(tokenLockFactory.unlockAvailable(0))
        .to.emit(tokenLockFactory, 'TokenUnlocked')
        .withArgs(0, token.address, (amount.div(4)).mul(2))

      expect(await tokenLockFactory.unlockedAmount(0)).to.eq(amount)
      expect(await tokenLockFactory.amountToUnlock(0)).to.eq(0)
    })
  })

  describe('Change owner', async () => {
    beforeEach(async function() {
      startTime = (await provider.getBlock(provider.blockNumber)).timestamp
    })

    it('Fails when campaign does not exist', async () => {
      await expect(tokenLockFactory.changeOwner(1, user1.address)).to.be.revertedWith("PSIPadTokenLockFactory: LOCK_DOES_NOT_EXIST")
    })
    it('Fails when user is not the owner', async () => {
      await token.approve(tokenLockFactory.address, amount)
      await tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) })
      await expect(tokenLockFactory.connect(user1).changeOwner(0, user1.address)).to.be.revertedWith("PSIPadTokenLockFactory: UNAUTHORIZED")
    })

    it('Succeeds', async () => {
      await token.approve(tokenLockFactory.address, amount)
      await tokenLockFactory.lock(token.address, amount, startTime, 60, 1, { value: expandTo18Decimals(0.2) })
      expect((await tokenLockFactory.tokensLocked(0)).owner).to.eq(owner.address)
      expect((await tokenLockFactory.getUserLocks(owner.address)).length).to.eq(1)
      expect((await tokenLockFactory.getUserLocks(user1.address)).length).to.eq(0)
      
      await expect(tokenLockFactory.changeOwner(0, user1.address))
        .to.emit(tokenLockFactory, 'OwnerChanged')
        .withArgs(0, owner.address, user1.address)

      expect((await tokenLockFactory.tokensLocked(0)).owner).to.eq(user1.address)
      expect((await tokenLockFactory.getUserLocks(owner.address)).length).to.eq(0)
      expect((await tokenLockFactory.getUserLocks(user1.address)).length).to.eq(1)
    })
  })
})
