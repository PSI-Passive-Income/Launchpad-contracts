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

export interface IPSIPadTokenDeployer extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): IPSIPadTokenDeployer;
  clone(): IPSIPadTokenDeployer;
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

    tokenTypes(
      typeId: number | string | BN
    ): NonPayableTransactionObject<string>;

    tokens(idx: number | string | BN): NonPayableTransactionObject<string>;
  };
  events: {
    TokenCreated(cb?: Callback<TokenCreated>): EventEmitter;
    TokenCreated(
      options?: EventOptions,
      cb?: Callback<TokenCreated>
    ): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "TokenCreated", cb: Callback<TokenCreated>): void;
  once(
    event: "TokenCreated",
    options: EventOptions,
    cb: Callback<TokenCreated>
  ): void;
}