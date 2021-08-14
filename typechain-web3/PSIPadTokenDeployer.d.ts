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

export type OwnershipTransferred = ContractEventLog<{
  previousOwner: string;
  newOwner: string;
  0: string;
  1: string;
}>;
export type TokenCreated = ContractEventLog<{
  owner: string;
  token: string;
  name: string;
  symbol: string;
  totalSupply: string;
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
}>;

export interface PSIPadTokenDeployer extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): PSIPadTokenDeployer;
  clone(): PSIPadTokenDeployer;
  methods: {
    createTokenWithCampaign(
      tokenData: [
        string,
        string,
        number | string | BN,
        number | string | BN,
        boolean,
        boolean,
        number | string | BN,
        boolean,
        string,
        string
      ]
    ): PayableTransactionObject<string>;

    fee_aggregator(): NonPayableTransactionObject<string>;

    initialize(
      _fee_aggregator: string,
      _stable_coin: string,
      _stable_coin_fee: number | string | BN
    ): NonPayableTransactionObject<void>;

    owner(): NonPayableTransactionObject<string>;

    renounceOwnership(): NonPayableTransactionObject<void>;

    setFeeAggregator(
      _fee_aggregator: string
    ): NonPayableTransactionObject<void>;

    setStableCoin(_stable_coin: string): NonPayableTransactionObject<void>;

    setStableCoinFee(
      _stable_coin_fee: number | string | BN
    ): NonPayableTransactionObject<void>;

    setTokenType(
      tokenType: number | string | BN,
      implementation: string
    ): NonPayableTransactionObject<void>;

    stable_coin(): NonPayableTransactionObject<string>;

    stable_coin_fee(): NonPayableTransactionObject<string>;

    tokenTypes(arg0: number | string | BN): NonPayableTransactionObject<string>;

    tokens(arg0: number | string | BN): NonPayableTransactionObject<string>;

    transferOwnership(newOwner: string): NonPayableTransactionObject<void>;
  };
  events: {
    OwnershipTransferred(cb?: Callback<OwnershipTransferred>): EventEmitter;
    OwnershipTransferred(
      options?: EventOptions,
      cb?: Callback<OwnershipTransferred>
    ): EventEmitter;

    TokenCreated(cb?: Callback<TokenCreated>): EventEmitter;
    TokenCreated(
      options?: EventOptions,
      cb?: Callback<TokenCreated>
    ): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "OwnershipTransferred", cb: Callback<OwnershipTransferred>): void;
  once(
    event: "OwnershipTransferred",
    options: EventOptions,
    cb: Callback<OwnershipTransferred>
  ): void;

  once(event: "TokenCreated", cb: Callback<TokenCreated>): void;
  once(
    event: "TokenCreated",
    options: EventOptions,
    cb: Callback<TokenCreated>
  ): void;
}
