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

export type OwnerChanged = ContractEventLog<{
  lockId: string;
  oldOwner: string;
  newOwner: string;
  0: string;
  1: string;
  2: string;
}>;
export type TokenLocked = ContractEventLog<{
  lockId: string;
  token: string;
  owner: string;
  amount: string;
  0: string;
  1: string;
  2: string;
  3: string;
}>;
export type TokenUnlocked = ContractEventLog<{
  lockId: string;
  token: string;
  amount: string;
  0: string;
  1: string;
  2: string;
}>;

export interface IPSIPadTokenLockFactory extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): IPSIPadTokenLockFactory;
  clone(): IPSIPadTokenLockFactory;
  methods: {
    amountToUnlock(
      lockId: number | string | BN
    ): NonPayableTransactionObject<string>;

    changeOwner(
      lockId: number | string | BN,
      newOwner: string
    ): NonPayableTransactionObject<void>;

    fee_aggregator(): NonPayableTransactionObject<string>;

    getUserLocks(user: string): NonPayableTransactionObject<string[]>;

    lock(
      token: string,
      amount: number | string | BN,
      start_time: number | string | BN,
      duration: number | string | BN,
      releases: number | string | BN
    ): PayableTransactionObject<string>;

    setFeeAggregator(
      _fee_aggregator: string
    ): NonPayableTransactionObject<void>;

    setStableCoin(_stable_coin: string): NonPayableTransactionObject<void>;

    setStableCoinFee(
      _stable_coin_fee: number | string | BN
    ): NonPayableTransactionObject<void>;

    stable_coin(): NonPayableTransactionObject<string>;

    stable_coin_fee(): NonPayableTransactionObject<string>;

    unlock(
      lockId: number | string | BN,
      amount: number | string | BN
    ): NonPayableTransactionObject<void>;

    unlockAvailable(
      lockId: number | string | BN
    ): NonPayableTransactionObject<void>;

    unlockedAmount(
      lockId: number | string | BN
    ): NonPayableTransactionObject<string>;
  };
  events: {
    OwnerChanged(cb?: Callback<OwnerChanged>): EventEmitter;
    OwnerChanged(
      options?: EventOptions,
      cb?: Callback<OwnerChanged>
    ): EventEmitter;

    TokenLocked(cb?: Callback<TokenLocked>): EventEmitter;
    TokenLocked(
      options?: EventOptions,
      cb?: Callback<TokenLocked>
    ): EventEmitter;

    TokenUnlocked(cb?: Callback<TokenUnlocked>): EventEmitter;
    TokenUnlocked(
      options?: EventOptions,
      cb?: Callback<TokenUnlocked>
    ): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "OwnerChanged", cb: Callback<OwnerChanged>): void;
  once(
    event: "OwnerChanged",
    options: EventOptions,
    cb: Callback<OwnerChanged>
  ): void;

  once(event: "TokenLocked", cb: Callback<TokenLocked>): void;
  once(
    event: "TokenLocked",
    options: EventOptions,
    cb: Callback<TokenLocked>
  ): void;

  once(event: "TokenUnlocked", cb: Callback<TokenUnlocked>): void;
  once(
    event: "TokenUnlocked",
    options: EventOptions,
    cb: Callback<TokenUnlocked>
  ): void;
}