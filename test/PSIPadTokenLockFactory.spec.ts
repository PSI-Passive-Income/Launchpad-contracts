import chai, { expect } from 'chai'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { IWETH } from '@passive-income/dpex-peripheral/typechain'
import { PSI, FeeAggregator, IBEP20 } from '@passive-income/psi-contracts/typechain'
import { PSIPadTokenLockFactory }  from '../typechain'

chai.use(waffle.solidity)

const overrides = {
  gasLimit: 9500000
}

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
