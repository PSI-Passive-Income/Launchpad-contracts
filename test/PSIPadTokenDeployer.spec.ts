// npx hardhat test test/PSIPadTokenDeployer.spec.ts

import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'

import { expandTo18Decimals, TOTAL_SUPPLY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { IWETH } from '@passive-income/dpex-peripheral/typechain'
import { PSI, IBEP20, FeeAggregator } from '@passive-income/psi-contracts/typechain'
import { PSIPadTokenDeployer, Token, TokenAnySwap }  from '../typechain'

import IBEP20Abi from '@passive-income/psi-contracts/abi/contracts/interfaces/IBEP20.sol/IBEP20.json'

chai.use(waffle.solidity)

describe('PSITokenDeployer', () => {
  const { provider, createFixtureLoader } = waffle;
  const [ owner, user1 ] = provider.getWallets()
  const loadFixture = createFixtureLoader([owner], provider)

  let psi: PSI
  let token: IBEP20
  let WETH: IWETH
  let baseToken: Token
  let baseTokenAnySwap: TokenAnySwap
  let feeAggregator: FeeAggregator
  let tokenDeployer: PSIPadTokenDeployer
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    psi = fixture.psi
    token = fixture.token
    WETH = fixture.WETH
    baseToken = fixture.baseToken
    baseTokenAnySwap = fixture.baseTokenAnySwap
    feeAggregator = fixture.feeAggregator
    tokenDeployer = fixture.tokenDeployer
  })

  const tokenData = {
    name: "Test Token",
    symbol: "TT",
    initialSupply: TOTAL_SUPPLY,
    maximumSupply: TOTAL_SUPPLY,
    burnable: false,
    mintable: false,
    minterDelay: 0,
    crossChain: false,
    underlying: ethers.constants.AddressZero,
    vault: ethers.constants.AddressZero
  }

  it('Default campaign factory', async () => {
    expect(await tokenDeployer.fee_aggregator()).to.eq(feeAggregator.address)
  })

  describe('Base tokens', async () => {
    it('Are deployed correctly', async () => {
      expect(await tokenDeployer.tokenTypes(0)).to.eq(baseToken.address)
      expect(await tokenDeployer.tokenTypes(1)).to.eq(baseTokenAnySwap.address)
      expect(await baseToken.deployer()).to.eq(owner.address)
      expect(await baseTokenAnySwap.deployer()).to.eq(owner.address)
    })
    it('Fails when basetoken is initialized', async () => {
      await expect(baseToken.connect(user1).initialize(tokenData.name, tokenData.symbol, tokenData.initialSupply, tokenData.maximumSupply, 
        tokenData.burnable, tokenData.mintable, tokenData.minterDelay))
        .to.be.revertedWith("UNAUTHORIZED")
      await expect(baseTokenAnySwap.connect(user1).initialize(tokenData.name, tokenData.symbol, tokenData.initialSupply, tokenData.maximumSupply, 
        tokenData.burnable, tokenData.mintable, tokenData.minterDelay, tokenData.underlying, tokenData.vault))
        .to.be.revertedWith("UNAUTHORIZED")
    })
  })

  describe('Create campaign', async () => {
    const expectedTokenAddress = "0x1C4f15B1fD292027582cdDCe7C2b730369b90eB8"

    it('Fails when the fee is not payed', async () => {
      await expect(tokenDeployer.createToken(tokenData)).to.be.revertedWith("PSIPadTokenDeployer: FEE_NOT_PAYED")
    })

    it('Succeeds', async () => {
      await expect(tokenDeployer.createToken(tokenData, { value: expandTo18Decimals(0.2) }))
        .to.emit(tokenDeployer, 'TokenCreated')
        .withArgs(owner.address, expectedTokenAddress, tokenData.name, tokenData.symbol, tokenData.initialSupply)

      const newToken = new ethers.Contract(expectedTokenAddress, IBEP20Abi, owner) as IBEP20
      expect(await newToken.balanceOf(owner.address)).to.eq(tokenData.initialSupply)
    })
  })
})
