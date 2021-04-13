import chai, { expect } from 'chai'
import { BigNumber, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

import { DPexRouter, DPexRouterPairs, IBEP20, IWETH, PancakeFactory, PancakePair, DPexWETHWrapper } from '../typechain'
import { DPexFactory, IDPexPair } from '@passive-income/dpex-swap-core/typechain'
import { IFeeAggregator } from '@passive-income/psi-contracts/typechain'

chai.use(waffle.solidity)

const overrides = {
  gasLimit: 9500000
}

describe('DPexRouter', () => {
  const { provider, createFixtureLoader } = waffle;
  const [wallet] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let token0: IBEP20
  let token1: IBEP20
  let WETH: IWETH
  let WETHPartner: IBEP20
  let factory: DPexFactory
  let router: DPexRouter
  let routerPairs: DPexRouterPairs
  let pair: IDPexPair
  let WETHPair: IDPexPair
  let WETHWrapper: DPexWETHWrapper
  let feeAggregator: IFeeAggregator
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    token0 = fixture.token0
    token1 = fixture.token1
    WETH = fixture.WETH
    WETHPartner = fixture.WETHPartner
    factory = fixture.factory
    router = fixture.router
    routerPairs = fixture.routerPairs
    pair = fixture.pair
    WETHPair = fixture.WETHPair
    WETHWrapper = fixture.WETHWrapper
    feeAggregator = fixture.feeAggregator
  })

  afterEach(async function() {
    expect(await provider.getBalance(router.address)).to.eq(constants.Zero)
  })

  it('factory, WETH', async () => {
    expect(await routerPairs.hasFactory(factory.address)).to.eq(true)
    expect(await router.WETH()).to.eq(WETH.address)
  })

  it('addLiquidity', async () => {
    const token0Amount = expandTo18Decimals(1)
    const token1Amount = expandTo18Decimals(4)

    const expectedLiquidity = expandTo18Decimals(2)
    await token0.approve(router.address, constants.MaxUint256)
    await token1.approve(router.address, constants.MaxUint256)
    await expect(
      router.addLiquidity(
        token0.address,
        token1.address,
        token0Amount,
        token1Amount,
        0,
        0,
        wallet.address,
        constants.MaxUint256,
        overrides
      )
    )
      .to.emit(token0, 'Transfer')
      .withArgs(wallet.address, pair.address, token0Amount)
      .to.emit(token1, 'Transfer')
      .withArgs(wallet.address, pair.address, token1Amount)
      .to.emit(pair, 'Transfer')
      .withArgs(constants.Zero, constants.Zero, MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Transfer')
      .withArgs(constants.Zero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount, token1Amount)
      .to.emit(pair, 'Mint')
      .withArgs(router.address, token0Amount, token1Amount)

    expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
  })

  it('addLiquidityETH', async () => {
    const WETHPartnerAmount = expandTo18Decimals(1)
    const ETHAmount = expandTo18Decimals(4)

    const expectedLiquidity = expandTo18Decimals(2)
    const WETHPairToken0 = await WETHPair.token0()
    await WETHPartner.approve(router.address, constants.MaxUint256)
    await expect(
      router.addLiquidityETH(
        WETHPartner.address,
        WETHPartnerAmount,
        WETHPartnerAmount,
        ETHAmount,
        wallet.address,
        constants.MaxUint256,
        { ...overrides, value: ETHAmount }
      )
    )
      .to.emit(WETHPair, 'Transfer')
      .withArgs(constants.Zero, constants.Zero, MINIMUM_LIQUIDITY)
      .to.emit(WETHPair, 'Transfer')
      .withArgs(constants.Zero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WETHPair, 'Sync')
      .withArgs(
        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
        WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
      )
      .to.emit(WETHPair, 'Mint')
      .withArgs(
        router.address,
        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
        WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
      )

    expect(await WETHPair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
  })

  async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(wallet.address, overrides)
  }
  it('removeLiquidity', async () => {
    const token0Amount = expandTo18Decimals(1)
    const token1Amount = expandTo18Decimals(4)
    await addLiquidity(token0Amount, token1Amount)

    const expectedLiquidity = expandTo18Decimals(2)
    await pair.approve(router.address, constants.MaxUint256)
    await expect(
      router.removeLiquidity(
        token0.address,
        token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        wallet.address,
        constants.MaxUint256,
        overrides
      )
    )
      .to.emit(pair, 'Transfer')
      .withArgs(wallet.address, pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(pair, 'Transfer')
      .withArgs(pair.address, constants.Zero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, token0Amount.sub(500))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, token1Amount.sub(2000))
      .to.emit(pair, 'Sync')
      .withArgs(500, 2000)
      .to.emit(pair, 'Burn')
      .withArgs(router.address, token0Amount.sub(500), token1Amount.sub(2000), wallet.address)

    expect(await pair.balanceOf(wallet.address)).to.eq(0)
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(500))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(2000))
  })

  it('removeLiquidityETH', async () => {
    const WETHPartnerAmount = expandTo18Decimals(1)
    const ETHAmount = expandTo18Decimals(4)
    const expectedLiquidity = expandTo18Decimals(2)
    const WETHPairToken0 = await WETHPair.token0()
    await WETHPair.approve(router.address, constants.MaxUint256)
    await WETHPartner.approve(router.address, constants.MaxUint256)

    await router.addLiquidityETH(
      WETHPartner.address,
      WETHPartnerAmount,
      WETHPartnerAmount,
      ETHAmount,
      wallet.address,
      constants.MaxUint256,
      { ...overrides, value: ETHAmount }
    )

    await expect(
      router.removeLiquidityETH(
        WETHPartner.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        wallet.address,
        constants.MaxUint256,
        overrides
      )
    )
      .to.emit(WETHPair, 'Transfer')
      .withArgs(wallet.address, WETHPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WETHPair, 'Transfer')
      .withArgs(WETHPair.address, constants.Zero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WETH, 'Transfer')
      .withArgs(WETHPair.address, router.address, ETHAmount.sub(2000))
      .to.emit(WETHPartner, 'Transfer')
      .withArgs(WETHPair.address, router.address, WETHPartnerAmount.sub(500))
      .to.emit(WETHPartner, 'Transfer')
      .withArgs(router.address, wallet.address, WETHPartnerAmount.sub(500))
      .to.emit(WETHPair, 'Sync')
      .withArgs(
        WETHPairToken0 === WETHPartner.address ? 500 : 2000,
        WETHPairToken0 === WETHPartner.address ? 2000 : 500
      )
      .to.emit(WETHPair, 'Burn')
      .withArgs(
        router.address,
        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount.sub(500) : ETHAmount.sub(2000),
        WETHPairToken0 === WETHPartner.address ? ETHAmount.sub(2000) : WETHPartnerAmount.sub(500),
        router.address
      )

    expect(await WETHPair.balanceOf(wallet.address)).to.eq(0)
    const totalSupplyWETHPartner = await WETHPartner.totalSupply()
    const totalSupplyWETH = await WETH.totalSupply()
    expect(await WETHPartner.balanceOf(wallet.address)).to.eq(totalSupplyWETHPartner.sub(500))
    expect(await WETH.balanceOf(wallet.address)).to.eq(totalSupplyWETH.sub(2000))
  })

  it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
    const WETHPartnerAmount = expandTo18Decimals(1)
    const ETHAmount = expandTo18Decimals(4)
    const expectedLiquidity = expandTo18Decimals(2)
    const WETHPairToken0 = await WETHPair.token0()
    await WETHPair.approve(router.address, constants.MaxUint256)
    await WETHPartner.approve(router.address, constants.MaxUint256)

    await router.addLiquidityETH(
      WETHPartner.address,
      WETHPartnerAmount,
      WETHPartnerAmount,
      ETHAmount,
      wallet.address,
      constants.MaxUint256,
      { ...overrides, value: ETHAmount }
    )

    await expect(
      router.removeLiquidityETHSupportingFeeOnTransferTokens(
        WETHPartner.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        wallet.address,
        constants.MaxUint256,
        overrides
      )
    )
      .to.emit(WETHPair, 'Transfer')
      .withArgs(wallet.address, WETHPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WETHPair, 'Transfer')
      .withArgs(WETHPair.address, constants.Zero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WETH, 'Transfer')
      .withArgs(WETHPair.address, router.address, ETHAmount.sub(2000))
      .to.emit(WETHPartner, 'Transfer')
      .withArgs(WETHPair.address, router.address, WETHPartnerAmount.sub(500))
      .to.emit(WETHPartner, 'Transfer')
      .withArgs(router.address, wallet.address, WETHPartnerAmount.sub(500))
      .to.emit(WETHPair, 'Sync')
      .withArgs(
        WETHPairToken0 === WETHPartner.address ? 500 : 2000,
        WETHPairToken0 === WETHPartner.address ? 2000 : 500
      )
      .to.emit(WETHPair, 'Burn')
      .withArgs(
        router.address,
        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount.sub(500) : ETHAmount.sub(2000),
        WETHPairToken0 === WETHPartner.address ? ETHAmount.sub(2000) : WETHPartnerAmount.sub(500),
        router.address
      )

    expect(await WETHPair.balanceOf(wallet.address)).to.eq(0)
    const totalSupplyWETHPartner = await WETHPartner.totalSupply()
    const totalSupplyWETH = await WETH.totalSupply()
    expect(await WETHPartner.balanceOf(wallet.address)).to.eq(totalSupplyWETHPartner.sub(500))
    expect(await WETH.balanceOf(wallet.address)).to.eq(totalSupplyWETH.sub(2000))
  })

  it('removeLiquidityWithPermit', async () => {
    const token0Amount = expandTo18Decimals(1)
    const token1Amount = expandTo18Decimals(4)
    await addLiquidity(token0Amount, token1Amount)

    const expectedLiquidity = expandTo18Decimals(2)

    const nonce = await pair.nonces(wallet.address)
    const digest = await getApprovalDigest(
      pair,
      { owner: wallet.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) },
      nonce,
      constants.MaxUint256
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await router.removeLiquidityWithPermit(
      token0.address,
      token1.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      0,
      0,
      wallet.address,
      constants.MaxUint256,
      false,
      v,
      r,
      s,
      overrides
    )
  })

  it('removeLiquidityETHWithPermit', async () => {
    const WETHPartnerAmount = expandTo18Decimals(1)
    const ETHAmount = expandTo18Decimals(4)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
    await WETH.deposit({ value: ETHAmount })
    await WETH.transfer(WETHPair.address, ETHAmount)
    await WETHPair.mint(wallet.address, overrides)

    const expectedLiquidity = expandTo18Decimals(2)

    const nonce = await WETHPair.nonces(wallet.address)
    const digest = await getApprovalDigest(
      WETHPair,
      { owner: wallet.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) },
      nonce,
      constants.MaxUint256
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await router.removeLiquidityETHWithPermit(
      WETHPartner.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      0,
      0,
      wallet.address,
      constants.MaxUint256,
      false,
      v,
      r,
      s,
      overrides
    )
  })

  describe('swapExactTokensForTokens', () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    const swapAmount = expandTo18Decimals(1)
    const swapAmountWithoutFee = BigNumber.from('999000000000000000')
    const feeAmount = BigNumber.from('1000000000000000')
    const expectedOutputAmount = BigNumber.from('1662500696181191868')

    beforeEach(async () => {
      await addLiquidity(token0Amount, token1Amount)
      await token0.approve(router.address, constants.MaxUint256)
    })

    it('happy path', async () => {
      await expect(
        router.swapExactTokensForTokens(
          factory.address,
          swapAmount,
          0,
          [token0.address, token1.address],
          wallet.address,
          constants.MaxUint256,
          overrides
        )
      )
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pair.address, swapAmountWithoutFee)
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, feeAggregator.address, feeAmount)
        .to.emit(token1, 'Transfer')
        .withArgs(pair.address, wallet.address, expectedOutputAmount)
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount.add(swapAmountWithoutFee), token1Amount.sub(expectedOutputAmount))
        .to.emit(pair, 'Swap')
        .withArgs(router.address, swapAmountWithoutFee, 0, 0, expectedOutputAmount, wallet.address)
    })

    it('gas', async () => {
      // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
      await mineBlock((await provider.getBlock('latest')).timestamp + 1)
      await pair.sync(overrides)

      await token0.approve(router.address, constants.MaxUint256)
      await mineBlock((await provider.getBlock('latest')).timestamp + 1)
      const tx = await router.swapExactTokensForTokens(
        factory.address,
        swapAmount,
        0,
        [token0.address, token1.address],
        wallet.address,
        constants.MaxUint256,
        overrides
      )
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(209684) //112859 without fees
    }).retries(3)
  })

  describe('swapTokensForExactTokens', () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    const expectedSwapAmount = BigNumber.from('556668893342240036')
    const feeAmount = BigNumber.from('556668893342241')
    const outputAmount = expandTo18Decimals(1)

    beforeEach(async () => {
      await addLiquidity(token0Amount, token1Amount)
    })

    it('happy path', async () => {
      await token0.approve(router.address, constants.MaxUint256)
      await expect(
        router.swapTokensForExactTokens(
          factory.address,
          outputAmount,
          constants.MaxUint256,
          [token0.address, token1.address],
          wallet.address,
          constants.MaxUint256,
          overrides
        )
      )
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pair.address, expectedSwapAmount)
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, feeAggregator.address, feeAmount)
        .to.emit(token1, 'Transfer')
        .withArgs(pair.address, wallet.address, outputAmount)
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount.add(expectedSwapAmount), token1Amount.sub(outputAmount))
        .to.emit(pair, 'Swap')
        .withArgs(router.address, expectedSwapAmount, 0, 0, outputAmount, wallet.address)
    })
  })

  describe('swapExactETHForTokens', () => {
    const WETHPartnerAmount = expandTo18Decimals(10)
    const ETHAmount = expandTo18Decimals(5)
    const swapAmount = expandTo18Decimals(1)
    const swapAmountWithoutFee = BigNumber.from('999000000000000000')
    const feeAmount = BigNumber.from('1000000000000000')
    const expectedOutputAmount = BigNumber.from('1662500696181191868')

    beforeEach(async () => {
      await WETHPartner.approve(router.address, constants.MaxUint256)
      await router.addLiquidityETH(
        WETHPartner.address,
        WETHPartnerAmount,
        WETHPartnerAmount,
        ETHAmount,
        wallet.address,
        constants.MaxUint256,
        { ...overrides, value: ETHAmount }
      )
    })

    it('happy path', async () => {
      const WETHPairToken0 = await WETHPair.token0()
      await expect(
        router.swapExactETHForTokens(factory.address, 0, [WETH.address, WETHPartner.address], wallet.address, constants.MaxUint256, {
          ...overrides,
          value: swapAmount
        })
      )
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHWrapper.address, WETHPair.address, swapAmountWithoutFee)
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHWrapper.address, feeAggregator.address, feeAmount)
        .to.emit(WETHPartner, 'Transfer')
        .withArgs(WETHPair.address, wallet.address, expectedOutputAmount)
        .to.emit(WETHPair, 'Sync')
        .withArgs(
          WETHPairToken0 === WETHPartner.address
            ? WETHPartnerAmount.sub(expectedOutputAmount)
            : ETHAmount.add(swapAmountWithoutFee),
          WETHPairToken0 === WETHPartner.address
            ? ETHAmount.add(swapAmountWithoutFee)
            : WETHPartnerAmount.sub(expectedOutputAmount)
        )
        .to.emit(WETHPair, 'Swap')
        .withArgs(
          router.address,
          WETHPairToken0 === WETHPartner.address ? 0 : swapAmountWithoutFee,
          WETHPairToken0 === WETHPartner.address ? swapAmountWithoutFee : 0,
          WETHPairToken0 === WETHPartner.address ? expectedOutputAmount : 0,
          WETHPairToken0 === WETHPartner.address ? 0 : expectedOutputAmount,
          wallet.address
        )
    })

    it('gas', async () => {
      const WETHPartnerAmount = expandTo18Decimals(10)
      const ETHAmount = expandTo18Decimals(5)
      await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
      await WETH.deposit({ value: ETHAmount })
      await WETH.transfer(WETHPair.address, ETHAmount)
      await WETHPair.mint(wallet.address, overrides)

      // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
      await mineBlock((await provider.getBlock('latest')).timestamp + 1)
      await pair.sync(overrides)

      const swapAmount = expandTo18Decimals(1)
      await mineBlock((await provider.getBlock('latest')).timestamp + 1)
      const tx = await router.swapExactETHForTokens(
        factory.address,
        0,
        [WETH.address, WETHPartner.address],
        wallet.address,
        constants.MaxUint256,
        {
          ...overrides,
          value: swapAmount
        }
      )
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(237611) // 122448 without fees
    }).retries(3)
  })

  describe('swapTokensForExactETH', () => {
    const WETHPartnerAmount = expandTo18Decimals(5)
    const ETHAmount = expandTo18Decimals(10)
    const expectedSwapAmount = BigNumber.from('557287483067034169')
    const feeAmount = BigNumber.from('1000000000000000')
    const outputAmount = expandTo18Decimals(1).add(feeAmount);

    beforeEach(async () => {
      await WETHPartner.approve(router.address, constants.MaxUint256)
      await router.addLiquidityETH(
        WETHPartner.address,
        WETHPartnerAmount,
        WETHPartnerAmount,
        ETHAmount,
        wallet.address,
        constants.MaxUint256,
        { ...overrides, value: ETHAmount }
      )
    })

    it('happy path', async () => {
      await WETHPartner.approve(router.address, constants.MaxUint256)
      const WETHPairToken0 = await WETHPair.token0()
      await expect(
        router.swapTokensForExactETH(
          factory.address,
          outputAmount.sub(feeAmount),
          constants.MaxUint256,
          [WETHPartner.address, WETH.address],
          wallet.address,
          constants.MaxUint256,
          overrides
        )
      )
        .to.emit(WETHPartner, 'Transfer')
        .withArgs(wallet.address, WETHPair.address, expectedSwapAmount)
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHPair.address, WETHWrapper.address, outputAmount)
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHWrapper.address, feeAggregator.address, feeAmount)
        .to.emit(WETHPair, 'Sync')
        .withArgs(
          WETHPairToken0 === WETHPartner.address
            ? WETHPartnerAmount.add(expectedSwapAmount)
            : ETHAmount.sub(outputAmount),
          WETHPairToken0 === WETHPartner.address
            ? ETHAmount.sub(outputAmount)
            : WETHPartnerAmount.add(expectedSwapAmount)
        )
        .to.emit(WETHPair, 'Swap')
        .withArgs(
          router.address,
          WETHPairToken0 === WETHPartner.address ? expectedSwapAmount : 0,
          WETHPairToken0 === WETHPartner.address ? 0 : expectedSwapAmount,
          WETHPairToken0 === WETHPartner.address ? 0 : outputAmount,
          WETHPairToken0 === WETHPartner.address ? outputAmount : 0,
          WETHWrapper.address
        )
    })
  })

  describe('swapExactTokensForETH', () => {
    const WETHPartnerAmount = expandTo18Decimals(5)
    const ETHAmount = expandTo18Decimals(10)
    const swapAmount = expandTo18Decimals(1)
    const feeAmount = BigNumber.from('1663887962654219')
    const expectedOutputAmount = BigNumber.from('1662224074691563853').add(feeAmount);

    beforeEach(async () => {
      await WETHPartner.approve(router.address, constants.MaxUint256)
      await router.addLiquidityETH(
        WETHPartner.address,
        WETHPartnerAmount,
        WETHPartnerAmount,
        ETHAmount,
        wallet.address,
        constants.MaxUint256,
        { ...overrides, value: ETHAmount }
      )
    })

    it('happy path', async () => {
      await WETHPartner.approve(router.address, constants.MaxUint256)
      const WETHPairToken0 = await WETHPair.token0()
      await expect(
        router.swapExactTokensForETH(
          factory.address,
          swapAmount,
          0,
          [WETHPartner.address, WETH.address],
          wallet.address,
          constants.MaxUint256,
          overrides
        )
      )
        .to.emit(WETHPartner, 'Transfer')
        .withArgs(wallet.address, WETHPair.address, swapAmount)
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHPair.address, WETHWrapper.address, expectedOutputAmount)
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHWrapper.address, feeAggregator.address, feeAmount)
        .to.emit(WETHPair, 'Sync')
        .withArgs(
          WETHPairToken0 === WETHPartner.address
            ? WETHPartnerAmount.add(swapAmount)
            : ETHAmount.sub(expectedOutputAmount),
          WETHPairToken0 === WETHPartner.address
            ? ETHAmount.sub(expectedOutputAmount)
            : WETHPartnerAmount.add(swapAmount)
        )
        .to.emit(WETHPair, 'Swap')
        .withArgs(
          router.address,
          WETHPairToken0 === WETHPartner.address ? swapAmount : 0,
          WETHPairToken0 === WETHPartner.address ? 0 : swapAmount,
          WETHPairToken0 === WETHPartner.address ? 0 : expectedOutputAmount,
          WETHPairToken0 === WETHPartner.address ? expectedOutputAmount : 0,
          WETHWrapper.address
        )
    })
  })

  describe('swapETHForExactTokens', () => {
    const WETHPartnerAmount = expandTo18Decimals(10)
    const ETHAmount = expandTo18Decimals(5)
    const expectedSwapAmount = BigNumber.from('556668893342240036')
    const feeAmount = BigNumber.from('556668893342241')
    const outputAmount = expandTo18Decimals(1)

    beforeEach(async () => {
      await WETHPartner.approve(router.address, constants.MaxUint256)
      await router.addLiquidityETH(
        WETHPartner.address,
        WETHPartnerAmount,
        WETHPartnerAmount,
        ETHAmount,
        wallet.address,
        constants.MaxUint256,
        { ...overrides, value: ETHAmount }
      )
    })

    it('happy path', async () => {
      const WETHPairToken0 = await WETHPair.token0()
      await expect(
        router.swapETHForExactTokens(
          factory.address,
          outputAmount,
          [WETH.address, WETHPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            ...overrides,
            value: expectedSwapAmount.add(feeAmount)
          }
        )
      )
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHWrapper.address, WETHPair.address, expectedSwapAmount)
        .to.emit(WETH, 'Transfer')
        .withArgs(WETHWrapper.address, feeAggregator.address, feeAmount)
        .to.emit(WETHPartner, 'Transfer')
        .withArgs(WETHPair.address, wallet.address, outputAmount)
        .to.emit(WETHPair, 'Sync')
        .withArgs(
          WETHPairToken0 === WETHPartner.address
            ? WETHPartnerAmount.sub(outputAmount)
            : ETHAmount.add(expectedSwapAmount),
          WETHPairToken0 === WETHPartner.address
            ? ETHAmount.add(expectedSwapAmount)
            : WETHPartnerAmount.sub(outputAmount)
        )
        .to.emit(WETHPair, 'Swap')
        .withArgs(
          router.address,
          WETHPairToken0 === WETHPartner.address ? 0 : expectedSwapAmount,
          WETHPairToken0 === WETHPartner.address ? expectedSwapAmount : 0,
          WETHPairToken0 === WETHPartner.address ? outputAmount : 0,
          WETHPairToken0 === WETHPartner.address ? 0 : outputAmount,
          wallet.address
        )
    })
  })

  describe('V2 amounts', () => {
    it('getAmountsOut', async () => {
      await token0.approve(router.address, constants.MaxUint256)
      await token1.approve(router.address, constants.MaxUint256)
      await router.addLiquidity(
        token0.address,
        token1.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        wallet.address,
        constants.MaxUint256,
        overrides
      )
  
      await expect(router.getAmountsOut(factory.address, BigNumber.from(2), [token0.address])).to.be.revertedWith(
        'DPexLibrary: INVALID_PATH'
      )
      const path = [token0.address, token1.address]
      const res: [BigNumber[], BigNumber, string] & {
        amounts: BigNumber[];
        feeAmount: BigNumber;
        feeToken: string;
      } = await router.getAmountsOut(factory.address, BigNumber.from(20000), path);
      expect(await router.getAmountsOut(factory.address, BigNumber.from(20000), path)).to.deep
        .eq([[BigNumber.from(19980), BigNumber.from(19550)], BigNumber.from(20), token0.address])
    })
  })
})
