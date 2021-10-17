/** @format */

import { BN, Long } from "@zilliqa-js/util";
import { Transaction, TxParams } from "@zilliqa-js/account";
import { Contract } from "@zilliqa-js/contract";
import * as T from "boost-zil";
import { signTransition } from "boost-zil";
import { Zilliqa } from "@zilliqa-js/zilliqa";
import { ContractSubStateQueryCast, partialState } from "boost-zil";

/**
 * this string is the signature of the hash of the source code
 * that was used to generate this sdk
 */
export const contractSignature =
  "hash_0x4569a383782fc6fdce278a3e66a55ddf9a4e235a5329fd9177d7c0437b867976";
const sig: {
  contractSignature: "hash_0x4569a383782fc6fdce278a3e66a55ddf9a4e235a5329fd9177d7c0437b867976";
} = { contractSignature };

export const code = `
(* sourceCodeHash=0x4569a383782fc6fdce278a3e66a55ddf9a4e235a5329fd9177d7c0437b867976 *)
(* sourceCodeHashKey=hash_0x4569a383782fc6fdce278a3e66a55ddf9a4e235a5329fd9177d7c0437b867976 *)
scilla_version 0
import IntUtils
library GZIL
let one_msg =
fun (msg: Message) =>
let nil_msg = Nil {Message} in
Cons {Message} msg nil_msg
let two_msgs =
fun (msg1: Message) =>
fun (msg2: Message) =>
let msgs_tmp = one_msg msg2 in
Cons {Message} msg1 msgs_tmp
type Error =
| CodeIsSender
| CodeInsufficientFunds
| CodeInsufficientAllowance
| CodeNotOwner
| CodeNotMinter
let make_error =
fun (result: Error) =>
let result_code =
match result with
| CodeIsSender              => Int32 -1
| CodeInsufficientFunds     => Int32 -2
| CodeInsufficientAllowance => Int32 -3
| CodeNotOwner              => Int32 -4
| CodeNotMinter             => Int32 -5
end
in
{ _exception: "Error"; code: result_code }
let zero = Uint128 0
let get_val =
fun (some_val: Option Uint128) =>
match some_val with
| Some val => val
| None => zero
end
contract GZIL
(
contract_owner: ByStr20,
init_minter: ByStr20,
name: String,
symbol: String,
decimals: Uint32,
init_supply: Uint128,
num_minting_blocks: Uint128
)
field total_supply: Uint128 = Uint128 0
field balances: Map ByStr20 Uint128
= let emp_map = Emp ByStr20 Uint128 in
builtin put emp_map contract_owner init_supply
field allowances: Map ByStr20 (Map ByStr20 Uint128)
= Emp ByStr20 (Map ByStr20 Uint128)
field minter: ByStr20 = init_minter
field end_block: BNum = builtin badd _creation_block num_minting_blocks
procedure ThrowError(err: Error)
e = make_error err;
throw e
end
procedure IsOwner(address: ByStr20)
is_owner = builtin eq contract_owner address;
match is_owner with
| True =>
| False =>
err = CodeNotOwner;
ThrowError err
end
end
procedure IsMinter()
current_minter <- minter;
is_minter = builtin eq current_minter _sender;
match is_minter with
| True =>
| False =>
err = CodeNotMinter;
ThrowError err
end
end
procedure IsNotSender(address: ByStr20)
is_sender = builtin eq _sender address;
match is_sender with
| True =>
err = CodeIsSender;
ThrowError err
| False =>
end
end
procedure AuthorizedMint(recipient: ByStr20, amount: Uint128)
some_bal <- balances[recipient];
bal = get_val some_bal;
new_balance = builtin add amount bal;
balances[recipient] := new_balance;
current_total_supply <- total_supply;
new_total_supply = builtin add current_total_supply amount;
total_supply := new_total_supply;
e = {_eventname: "Minted"; minter: _sender; recipient: recipient; amount: amount};
event e
end
procedure AuthorizedMoveIfSufficientBalance(from: ByStr20, to: ByStr20, amount: Uint128)
o_from_bal <- balances[from];
bal = get_val o_from_bal;
can_do = uint128_le amount bal;
match can_do with
| True =>
new_from_bal = builtin sub bal amount;
balances[from] := new_from_bal;
get_to_bal <- balances[to];
new_to_bal = match get_to_bal with
| Some bal => builtin add bal amount
| None => amount
end;
balances[to] := new_to_bal
| False =>
err = CodeInsufficientFunds;
ThrowError err
end
end
transition ChangeMinter(new_minter: ByStr20)
IsOwner _sender;
minter := new_minter;
e = {_eventname: "ChangedMinter"; new_minter: new_minter};
event e
end
transition Mint(recipient: ByStr20, amount: Uint128)
current_block <- & BLOCKNUMBER;
end_block_num <- end_block;
is_minting_over = builtin blt end_block_num current_block;
match is_minting_over with
| True =>
e = {_eventname: "MintIsOver"};
event e
| False =>
IsMinter;
AuthorizedMint recipient amount;
msg_to_recipient = {_tag: "RecipientAcceptMint"; _recipient: recipient; _amount: zero;
minter: _sender; recipient: recipient; amount: amount};
msgs = one_msg msg_to_recipient;
send msgs
end
end
transition IncreaseAllowance(spender: ByStr20, amount: Uint128)
IsNotSender spender;
some_current_allowance <- allowances[_sender][spender];
current_allowance = get_val some_current_allowance;
new_allowance = builtin add current_allowance amount;
allowances[_sender][spender] := new_allowance;
e = {_eventname: "IncreasedAllowance"; token_owner: _sender; spender: spender; new_allowance: new_allowance};
event e
end
transition DecreaseAllowance(spender: ByStr20, amount: Uint128)
IsNotSender spender;
some_current_allowance <- allowances[_sender][spender];
current_allowance = get_val some_current_allowance;
new_allowance =
let amount_le_allowance = uint128_le amount current_allowance in
match amount_le_allowance with
| True => builtin sub current_allowance amount
| False => zero
end;
allowances[_sender][spender] := new_allowance;
e = {_eventname: "DecreasedAllowance"; token_owner: _sender; spender: spender; new_allowance: new_allowance};
event e
end
transition Transfer(to: ByStr20, amount: Uint128)
AuthorizedMoveIfSufficientBalance _sender to amount;
e = {_eventname : "TransferSuccess"; sender : _sender; recipient : to; amount : amount};
event e;
msg_to_recipient = {_tag: "RecipientAcceptTransfer"; _recipient: to; _amount: zero;
sender: _sender; recipient: to; amount: amount};
msg_to_sender = {_tag: "TransferSuccessCallBack"; _recipient: _sender; _amount: zero;
sender: _sender; recipient: to; amount: amount};
msgs = two_msgs msg_to_recipient msg_to_sender;
send msgs
end
transition TransferFrom(from: ByStr20, to: ByStr20, amount: Uint128)
o_spender_allowed <- allowances[from][_sender];
allowed = get_val o_spender_allowed;
can_do = uint128_le amount allowed;
match can_do with
| True =>
AuthorizedMoveIfSufficientBalance from to amount;
e = {_eventname : "TransferFromSuccess"; initiator : _sender; sender : from; recipient : to; amount : amount};
event e;
new_allowed = builtin sub allowed amount;
allowances[from][_sender] := new_allowed;
msg_to_recipient = {_tag: "RecipientAcceptTransferFrom"; _recipient : to; _amount: zero;
initiator: _sender; sender : from; recipient: to; amount: amount};
msg_to_sender = {_tag: "TransferFromSuccessCallBack"; _recipient: _sender; _amount: zero;
initiator: _sender; sender: from; recipient: to; amount: amount};
msgs = two_msgs msg_to_recipient msg_to_sender;
send msgs
| False =>
err = CodeInsufficientAllowance;
ThrowError err
end
end`;

declare var window: any;

export type TXLog = (t: Transaction, msg: string) => void;

const thereIsZilPay = () => {
  if (typeof window != "undefined") {
    if (typeof window.zilPay != "undefined") {
      return true;
    }
  }
  return false;
};

const getTrail = () => {
  if (thereIsZilPay()) {
    return [];
  } else {
    return [31, 1000];
  }
};

/**
 * will try to send a transaction to the contract
 * @warning WILL NOT THROW ERRORS IF CONTRACT SIGNATURES ARE INVALID
 */
const dangerousFromJSONDeploy =
  (txLink: TXLog) =>
  ({ getVersion, getZil }: SDKResolvers) =>
  async (t: Omit<Omit<DeployData, "isDeploy">, "code">, gasLimit: Long) => {
    let teardownFun: any;
    try {
      const { zil, teardown } = await getZil(true);
      teardownFun = teardown;
      const gasPrice = await getMinGasPrice(zil);

      const contract = newContract(zil, code, t.data);
      const [tx, con] = await contract.deploy(
        {
          version: getVersion(),
          gasPrice,
          gasLimit,
        },
        ...getTrail()
      );
      await teardown();
      txLink(tx, "Deploy");
      if (!con.address) {
        if (con.error) {
          throw new Error(JSON.stringify(con.error, null, 2));
        }
        throw new Error("Contract failed to deploy");
      }
      return { tx, contract: con, address: new T.ByStr20(con.address) };
    } catch (e) {
      if (teardownFun) {
        await teardownFun();
      }
      throw e;
    }
    throw "this never happens leave me alone ts";
  };

/**
 * will try to send a transaction to the contract
 * @warning WILL NOT THROW ERRORS IF CONTRACT SIGNATURES ARE INVALID
 */
const dangerousFromJSONCall =
  (txLink: TXLog) =>
  ({ getVersion, getZil }: SDKResolvers) =>
  async (t: Omit<CallData, "isDeploy">, gasLimit: Long) => {
    let teardownFun: any;
    try {
      const { zil, teardown } = await getZil(true);
      teardownFun = teardown;
      const gasPrice = await getMinGasPrice(zil);
      const contract = getContract(
        zil,
        new T.ByStr20(t.contractAddress).toSend()
      );

      const tx = await contract.call(
        t.contractTransitionName,
        t.data,
        {
          version: getVersion(),
          amount: new BN(t.amount),
          gasPrice,
          gasLimit,
        },
        ...getTrail()
      );
      await teardown();
      txLink(tx, t.contractTransitionName);
      return { tx };
    } catch (e) {
      if (teardownFun) {
        await teardownFun();
      }
      throw e;
    }
    throw "this never happens leave me alone ts";
  };

export interface SDKResolvers {
  getZil: (
    requireSigner?: boolean
  ) => Promise<{ zil: Zilliqa; teardown: () => Promise<void> }>;
  getVersion: () => number;
  getNetworkName: () => string;
  txLog?: TXLog;
}

const RED = "\x1B[31m%s\x1b[0m";
const CYAN = "\x1B[36m%s\x1b[0m";
const GREEN = "\x1B[32m%s\x1b[0m";
const MAGENTA = "\x1B[35m%s\x1b[0m";

interface Value {
  vname: string;
  type: string;
  value: string | ADTValue | ADTValue[] | string[];
}
interface ADTValue {
  constructor: string;
  argtypes: string[];
  arguments: Value[] | string[];
}

interface DeployData {
  isDeploy: boolean;
  /**
   * the signature hash of the source code of the contract that this data interacts with
   */
  contractSignature: string;
  /**
   * code of the contract to deploy
   */
  code: string;
  data: any[];
}
interface CallData {
  isDeploy: boolean;
  /**
   * the signature hash of the source code of the contract that this data interacts with
   */
  contractSignature: string;
  /**
   * contract to send the transaction to
   */
  contractAddress: string;
  /**
   * zil amount to send
   */
  amount: string;
  /**
   * the name of the transition called in the target contract
   */
  contractTransitionName: string;
  data: any[];
}
/**
 * general interface of the data returned by toJSON() on the transitions
 */
type TransactionData = DeployData | CallData;

function getContract(
  zil: Zilliqa,
  a: string
): Contract & {
  call: (
    transition: string,
    args: Value[],
    params: Pick<
      TxParams,
      "version" | "amount" | "gasPrice" | "gasLimit" | "nonce" | "pubKey"
    >,
    attempts?: number,
    interval?: number,
    toDs?: boolean
  ) => ReturnType<Contract["call"]>;
} {
  const address = new T.ByStr20(a).toSend();
  //@ts-ignore
  return zil.contracts.at(address);
}

function newContract(zil: Zilliqa, code: string, init: Value[]): Contract {
  //@ts-ignore
  return zil.contracts.new(code, init);
}

async function getMinGasPrice(zil: Zilliqa) {
  const res = await zil.blockchain.getMinimumGasPrice();
  if (!res.result) {
    throw "no gas price";
  }
  return new BN(res.result);
}

export const GZIL = (resolvers: SDKResolvers) => {
  const logUrl = (id: string, msg: string) => {
    const network = getNetworkName();
    console.log(MAGENTA, msg + " 🔥");
    if (network == "mainnet" || network == "testnet") {
      const url = `https://viewblock.io/zilliqa/tx/0x${id}?network=${network}`;
      console.log(CYAN, url);
    }
  };
  const zilpayLog = (t: Transaction, msg: string) => {
    console.log(t);
    //@ts-ignore
    const id = t.ID;
    logUrl(id as string, msg);
  };
  const nodeLog = (t: Transaction, msg: string) => {
    const id = t.id;
    logUrl(id as string, msg);
    const receipt = t.getReceipt();
    if (receipt) {
      if (receipt.success) {
        console.log(GREEN, "Success.");
      } else {
        console.log(RED, "Failed.");
        if (receipt.exceptions) {
          Object.entries(receipt.exceptions).map(([k, v]) => {
            console.log(RED, v);
          });
        }
      }
      if (receipt.event_logs) {
        const events = receipt.event_logs as {
          _eventname: string;
          address: string;
          params: { value: string; vname: string }[];
        }[];
        if (events.length != 0) {
          console.log(CYAN, `Events🕵️‍♀️`);
          events.forEach((e) => {
            console.log(CYAN, `${e._eventname}`);
            e.params.forEach((p) => {
              console.log(CYAN, `${p.vname}: `);
              console.log(MAGENTA, `${JSON.stringify(p.value, null, 2)}`);
            });
          });
        }
      }
    }
  };
  const defaultTxLog = (t: Transaction, msg: string) => {
    if (thereIsZilPay()) {
      zilpayLog(t, msg);
    } else {
      nodeLog(t, msg);
    }
  };
  const { getZil, getVersion, getNetworkName } = resolvers;
  const txLink = resolvers.txLog ? resolvers.txLog : defaultTxLog;

  return {
    async balance(a: T.ByStr20) {
      const res = await getZil();
      const bal = await res.zil.blockchain.getBalance(a.toSend());
      await res.teardown();
      return new T.Uint128(bal.result.balance);
    },

    /**
     * will try to send a transaction to the contract
     * @warning WILL NOT THROW ERRORS IF CONTRACT SIGNATURES ARE INVALID
     */
    dangerousFromJSONDeploy: dangerousFromJSONDeploy(txLink)(resolvers),

    /**
     * will try to send a transaction to the contract
     * @warning WILL NOT THROW ERRORS IF CONTRACT SIGNATURES ARE INVALID
     */
    dangerousFromJSONCall: dangerousFromJSONCall(txLink)(resolvers),

    deploy: (
      gasLimit: Long,
      __contract_owner: T.ByStr20,
      __init_minter: T.ByStr20,
      __name: T.ScillaString,
      __symbol: T.ScillaString,
      __decimals: T.Uint32,
      __init_supply: T.Uint128,
      __num_minting_blocks: T.Uint128
    ) => {
      const transactionData = {
        isDeploy: true,
        ...sig,
        data: [
          {
            type: `Uint32`,
            vname: `_scilla_version`,
            value: "0",
          },
          {
            type: `ByStr20`,
            vname: `contract_owner`,
            value: __contract_owner.toSend(),
          },
          {
            type: `ByStr20`,
            vname: `init_minter`,
            value: __init_minter.toSend(),
          },
          {
            type: `String`,
            vname: `name`,
            value: __name.toSend(),
          },
          {
            type: `String`,
            vname: `symbol`,
            value: __symbol.toSend(),
          },
          {
            type: `Uint32`,
            vname: `decimals`,
            value: __decimals.toSend(),
          },
          {
            type: `Uint128`,
            vname: `init_supply`,
            value: __init_supply.toSend(),
          },
          {
            type: `Uint128`,
            vname: `num_minting_blocks`,
            value: __num_minting_blocks.toSend(),
          },
        ],
      };
      return {
        /**
         * get data needed to perform this transaction
         * */
        toJSON: () => transactionData,
        /**
         * send the transaction to the blockchain
         * */
        send: async () =>
          dangerousFromJSONDeploy(txLink)(resolvers)(transactionData, gasLimit),
      };
    },

    state: <
      E extends "true" | "false",
      Query extends ContractSubStateQueryCast<
        "total_supply" | "balances" | "allowances" | "minter" | "end_block"
      >
    >(
      query: Query,
      includeInit: E
    ) => ({
      get: (...contractAddresses: T.ByStr20[]) =>
        partialState(async () => {
          return (await getZil()).zil;
        })<
          typeof query,
          typeof includeInit,
          {
            contractAddress: typeof contractAddresses[0];
            includeInit: typeof includeInit;
            query: typeof query;
          },
          {
            contract_owner: any;
            init_minter: any;
            name: any;
            symbol: any;
            decimals: any;
            init_supply: any;
            num_minting_blocks: any;
          }
        >(
          ...contractAddresses.map((c) => ({
            contractAddress: c,
            includeInit,
            query,
          }))
        ),
    }),

    /**
     * interface for scilla contract with source code hash:
     * 0x4569a383782fc6fdce278a3e66a55ddf9a4e235a5329fd9177d7c0437b867976
     */
    calls: (a: T.ByStr20) => (gasLimit: Long) => {
      const signer = signTransition(a);
      return {
        ChangeMinter: (__new_minter: T.ByStr20) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `ChangeMinter`,
            data: [
              {
                type: `ByStr20`,
                vname: `new_minter`,
                value: __new_minter.toSend(),
              },
            ],
            amount: new BN(0).toString(),
          };
          return {
            /**
             * get data needed to perform this transaction
             * */
            toJSON: () => transactionData,
            /**
             * send the transaction to the blockchain
             * */
            send: async () =>
              dangerousFromJSONCall(txLink)(resolvers)(
                transactionData,
                gasLimit
              ),
          };
        },

        Mint: (__recipient: T.ByStr20, __amount: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `Mint`,
            data: [
              {
                type: `ByStr20`,
                vname: `recipient`,
                value: __recipient.toSend(),
              },
              {
                type: `Uint128`,
                vname: `amount`,
                value: __amount.toSend(),
              },
            ],
            amount: new BN(0).toString(),
          };
          return {
            /**
             * get data needed to perform this transaction
             * */
            toJSON: () => transactionData,
            /**
             * send the transaction to the blockchain
             * */
            send: async () =>
              dangerousFromJSONCall(txLink)(resolvers)(
                transactionData,
                gasLimit
              ),
          };
        },

        IncreaseAllowance: (__spender: T.ByStr20, __amount: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `IncreaseAllowance`,
            data: [
              {
                type: `ByStr20`,
                vname: `spender`,
                value: __spender.toSend(),
              },
              {
                type: `Uint128`,
                vname: `amount`,
                value: __amount.toSend(),
              },
            ],
            amount: new BN(0).toString(),
          };
          return {
            /**
             * get data needed to perform this transaction
             * */
            toJSON: () => transactionData,
            /**
             * send the transaction to the blockchain
             * */
            send: async () =>
              dangerousFromJSONCall(txLink)(resolvers)(
                transactionData,
                gasLimit
              ),
          };
        },

        DecreaseAllowance: (__spender: T.ByStr20, __amount: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `DecreaseAllowance`,
            data: [
              {
                type: `ByStr20`,
                vname: `spender`,
                value: __spender.toSend(),
              },
              {
                type: `Uint128`,
                vname: `amount`,
                value: __amount.toSend(),
              },
            ],
            amount: new BN(0).toString(),
          };
          return {
            /**
             * get data needed to perform this transaction
             * */
            toJSON: () => transactionData,
            /**
             * send the transaction to the blockchain
             * */
            send: async () =>
              dangerousFromJSONCall(txLink)(resolvers)(
                transactionData,
                gasLimit
              ),
          };
        },

        Transfer: (__to: T.ByStr20, __amount: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `Transfer`,
            data: [
              {
                type: `ByStr20`,
                vname: `to`,
                value: __to.toSend(),
              },
              {
                type: `Uint128`,
                vname: `amount`,
                value: __amount.toSend(),
              },
            ],
            amount: new BN(0).toString(),
          };
          return {
            /**
             * get data needed to perform this transaction
             * */
            toJSON: () => transactionData,
            /**
             * send the transaction to the blockchain
             * */
            send: async () =>
              dangerousFromJSONCall(txLink)(resolvers)(
                transactionData,
                gasLimit
              ),
          };
        },

        TransferFrom: (
          __from: T.ByStr20,
          __to: T.ByStr20,
          __amount: T.Uint128
        ) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `TransferFrom`,
            data: [
              {
                type: `ByStr20`,
                vname: `from`,
                value: __from.toSend(),
              },
              {
                type: `ByStr20`,
                vname: `to`,
                value: __to.toSend(),
              },
              {
                type: `Uint128`,
                vname: `amount`,
                value: __amount.toSend(),
              },
            ],
            amount: new BN(0).toString(),
          };
          return {
            /**
             * get data needed to perform this transaction
             * */
            toJSON: () => transactionData,
            /**
             * send the transaction to the blockchain
             * */
            send: async () =>
              dangerousFromJSONCall(txLink)(resolvers)(
                transactionData,
                gasLimit
              ),
          };
        },
      };
    },
  };
};
