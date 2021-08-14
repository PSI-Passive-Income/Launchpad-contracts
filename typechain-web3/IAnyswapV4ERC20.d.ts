/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { ContractOptions } from "web3-eth-contract";
import { EventLog } from "web3-core";
import { EventEmitter } from "events";
import {
  Callback,
  PayableTransactionObject,
  NonPayableTransactionObject,
  BlockType,
  ContractEventLog,
  BaseContract,
} from "./types";

interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export type Approval = ContractEventLog<{
  owner: string;
  spender: string;
  value: string;
  0: string;
  1: string;
  2: string;
}>;
export type LogAddAuth = ContractEventLog<{
  auth: string;
  timestamp: string;
  0: string;
  1: string;
}>;
export type LogChangeMPCOwner = ContractEventLog<{
  oldOwner: string;
  newOwner: string;
  effectiveHeight: string;
  0: string;
  1: string;
  2: string;
}>;
export type LogChangeVault = ContractEventLog<{
  oldVault: string;
  newVault: string;
  effectiveTime: string;
  0: string;
  1: string;
  2: string;
}>;
export type LogSwapin = ContractEventLog<{
  txhash: string;
  account: string;
  amount: string;
  0: string;
  1: string;
  2: string;
}>;
export type LogSwapout = ContractEventLog<{
  account: string;
  bindaddr: string;
  amount: string;
  0: string;
  1: string;
  2: string;
}>;
export type Transfer = ContractEventLog<{
  from: string;
  to: string;
  value: string;
  0: string;
  1: string;
  2: string;
}>;

export interface IAnyswapV4ERC20 extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): IAnyswapV4ERC20;
  clone(): IAnyswapV4ERC20;
  methods: {
    DOMAIN_SEPARATOR(): NonPayableTransactionObject<string>;

    Swapin(
      txhash: string | number[],
      account: string,
      amount: number | string | BN
    ): NonPayableTransactionObject<boolean>;

    Swapout(
      amount: number | string | BN,
      bindaddr: string
    ): NonPayableTransactionObject<boolean>;

    addMinter(minter: string): NonPayableTransactionObject<void>;

    allowance(
      owner: string,
      spender: string
    ): NonPayableTransactionObject<string>;

    applyMinter(minter: string): NonPayableTransactionObject<void>;

    applyVault(): NonPayableTransactionObject<void>;

    approve(
      spender: string,
      amount: number | string | BN
    ): NonPayableTransactionObject<boolean>;

    balanceOf(account: string): NonPayableTransactionObject<string>;

    burn(
      from: string,
      amount: number | string | BN
    ): NonPayableTransactionObject<boolean>;

    changeMPCOwner(newVault: string): NonPayableTransactionObject<void>;

    changeVault(newVault: string): NonPayableTransactionObject<void>;

    delayVault(): NonPayableTransactionObject<string>;

    "deposit(uint256,address)"(
      amount: number | string | BN,
      to: string
    ): NonPayableTransactionObject<string>;

    "deposit(uint256)"(
      amount: number | string | BN
    ): NonPayableTransactionObject<string>;

    "deposit()"(): NonPayableTransactionObject<string>;

    depositVault(
      amount: number | string | BN,
      to: string
    ): NonPayableTransactionObject<string>;

    depositWithPermit(
      target: string,
      value: number | string | BN,
      deadline: number | string | BN,
      v: number | string | BN,
      r: string | number[],
      s: string | number[],
      to: string
    ): NonPayableTransactionObject<string>;

    depositWithTransferPermit(
      target: string,
      value: number | string | BN,
      deadline: number | string | BN,
      v: number | string | BN,
      r: string | number[],
      s: string | number[],
      to: string
    ): NonPayableTransactionObject<string>;

    isMinter(minter: string): NonPayableTransactionObject<boolean>;

    mint(
      account: string,
      amount: number | string | BN
    ): NonPayableTransactionObject<void>;

    mintable(): NonPayableTransactionObject<boolean>;

    minterDelay(): NonPayableTransactionObject<string>;

    minterPending(minter: string): NonPayableTransactionObject<string>;

    minters(): NonPayableTransactionObject<string[]>;

    mpc(): NonPayableTransactionObject<string>;

    nonces(owner: string): NonPayableTransactionObject<string>;

    pendingVault(): NonPayableTransactionObject<string>;

    permit(
      owner: string,
      spender: string,
      value: number | string | BN,
      deadline: number | string | BN,
      v: number | string | BN,
      r: string | number[],
      s: string | number[]
    ): NonPayableTransactionObject<void>;

    removeMinter(minter: string): NonPayableTransactionObject<void>;

    revokeVault(): NonPayableTransactionObject<void>;

    setVaultOnly(enabled: boolean): NonPayableTransactionObject<void>;

    supportsInterface(
      interfaceId: string | number[]
    ): NonPayableTransactionObject<boolean>;

    totalSupply(): NonPayableTransactionObject<string>;

    transfer(
      recipient: string,
      amount: number | string | BN
    ): NonPayableTransactionObject<boolean>;

    transferFrom(
      sender: string,
      recipient: string,
      amount: number | string | BN
    ): NonPayableTransactionObject<boolean>;

    transferWithPermit(
      owner: string,
      to: string,
      value: number | string | BN,
      deadline: number | string | BN,
      v: number | string | BN,
      r: string | number[],
      s: string | number[]
    ): NonPayableTransactionObject<boolean>;

    underlying(): NonPayableTransactionObject<string>;

    vault(): NonPayableTransactionObject<string>;

    "withdraw(uint256,address)"(
      amount: number | string | BN,
      to: string
    ): NonPayableTransactionObject<string>;

    "withdraw(uint256)"(
      amount: number | string | BN
    ): NonPayableTransactionObject<string>;

    "withdraw()"(): NonPayableTransactionObject<string>;

    withdrawVault(
      from: string,
      amount: number | string | BN,
      to: string
    ): NonPayableTransactionObject<string>;
  };
  events: {
    Approval(cb?: Callback<Approval>): EventEmitter;
    Approval(options?: EventOptions, cb?: Callback<Approval>): EventEmitter;

    LogAddAuth(cb?: Callback<LogAddAuth>): EventEmitter;
    LogAddAuth(options?: EventOptions, cb?: Callback<LogAddAuth>): EventEmitter;

    LogChangeMPCOwner(cb?: Callback<LogChangeMPCOwner>): EventEmitter;
    LogChangeMPCOwner(
      options?: EventOptions,
      cb?: Callback<LogChangeMPCOwner>
    ): EventEmitter;

    LogChangeVault(cb?: Callback<LogChangeVault>): EventEmitter;
    LogChangeVault(
      options?: EventOptions,
      cb?: Callback<LogChangeVault>
    ): EventEmitter;

    LogSwapin(cb?: Callback<LogSwapin>): EventEmitter;
    LogSwapin(options?: EventOptions, cb?: Callback<LogSwapin>): EventEmitter;

    LogSwapout(cb?: Callback<LogSwapout>): EventEmitter;
    LogSwapout(options?: EventOptions, cb?: Callback<LogSwapout>): EventEmitter;

    Transfer(cb?: Callback<Transfer>): EventEmitter;
    Transfer(options?: EventOptions, cb?: Callback<Transfer>): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "Approval", cb: Callback<Approval>): void;
  once(event: "Approval", options: EventOptions, cb: Callback<Approval>): void;

  once(event: "LogAddAuth", cb: Callback<LogAddAuth>): void;
  once(
    event: "LogAddAuth",
    options: EventOptions,
    cb: Callback<LogAddAuth>
  ): void;

  once(event: "LogChangeMPCOwner", cb: Callback<LogChangeMPCOwner>): void;
  once(
    event: "LogChangeMPCOwner",
    options: EventOptions,
    cb: Callback<LogChangeMPCOwner>
  ): void;

  once(event: "LogChangeVault", cb: Callback<LogChangeVault>): void;
  once(
    event: "LogChangeVault",
    options: EventOptions,
    cb: Callback<LogChangeVault>
  ): void;

  once(event: "LogSwapin", cb: Callback<LogSwapin>): void;
  once(
    event: "LogSwapin",
    options: EventOptions,
    cb: Callback<LogSwapin>
  ): void;

  once(event: "LogSwapout", cb: Callback<LogSwapout>): void;
  once(
    event: "LogSwapout",
    options: EventOptions,
    cb: Callback<LogSwapout>
  ): void;

  once(event: "Transfer", cb: Callback<Transfer>): void;
  once(event: "Transfer", options: EventOptions, cb: Callback<Transfer>): void;
}