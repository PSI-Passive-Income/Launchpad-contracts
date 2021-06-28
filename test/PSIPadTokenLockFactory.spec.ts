import chai, { expect } from 'chai'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
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
  const [owner,user] = provider.getWallets()
  const loadFixture = createFixtureLoader([owner], provider)

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
})
