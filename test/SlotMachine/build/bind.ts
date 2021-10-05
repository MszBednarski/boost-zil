/** @format */

import { BN, Long } from "@zilliqa-js/util";
import { Transaction, TxParams } from "@zilliqa-js/account";
import { Contract } from "@zilliqa-js/contract";
import * as T from "../../../src";
import { signTransition } from "../../../src";
import { Zilliqa } from "@zilliqa-js/zilliqa";
import { ContractSubStateQueryCast, partialState } from "../../../src";

/**
 * this string is the signature of the hash of the source code
 * that was used to generate this sdk
 */
export const contractSignature =
  "hash_0xc0420baf5e3c128496dab69934fcdca17cd69619f0ff802319bd4d72a50e2481";
const sig: {
  contractSignature: "hash_0xc0420baf5e3c128496dab69934fcdca17cd69619f0ff802319bd4d72a50e2481";
} = { contractSignature };

export const code = `
(* sourceCodeHash=0xc0420baf5e3c128496dab69934fcdca17cd69619f0ff802319bd4d72a50e2481 *)
(* sourceCodeHashKey=hash_0xc0420baf5e3c128496dab69934fcdca17cd69619f0ff802319bd4d72a50e2481 *)
scilla_version 0

import IntUtils

library SlotMachine
type Error =
| NotAuthorized
| NoStagedAdmin
| NotEnoughZILSent
| InvalidSignature
| CannotClaimMoreThanMax
| UnknownRewardTier
| DiscountTooBig
| InvalidCheque

let make_error =
fun (result: Error) =>
let result_code =
match result with
| NotAuthorized => Int32 -1
| NoStagedAdmin => Int32 -2
| NotEnoughZILSent => Int32 -3
| InvalidSignature => Int32 -4
| CannotClaimMoreThanMax => Int32 -5
| UnknownRewardTier => Int32 -6
| DiscountTooBig => Int32 -7
| InvalidCheque => Int32 -8
end
in
{ _exception: "Error"; code: result_code }

let one_msg = 
    fun(msg: Message) =>
    let nil_msg = Nil{Message} in Cons{Message} msg nil_msg

let zero = Uint128 0
let one = Uint128 1
let zeroByStr0 = 0x
let zeroByStr20 = 0x0000000000000000000000000000000000000000
let zeroByStr = builtin to_bystr zeroByStr0
let discount_denominator = Uint128 10000
let true = True

type Uint128Pair =
| Uint128Pair of Uint128 Uint128
let uint128_to_uint256: Uint128 -> Uint256 =
  fun (x: Uint128) =>
    let ox256 = builtin to_uint256 x in
      match ox256 with
      | None =>
        
        let zero = Uint256 0 in
        builtin div zero zero
      | Some x256 => x256
      end

let muldiv: Uint128 -> Uint128 -> Uint128 -> Uint128 =
    fun (x: Uint128) =>
    fun (y: Uint128) =>
    fun (z: Uint128) =>
      let x256 = uint128_to_uint256 x in
      let y256 = uint128_to_uint256 y in
      let z256 = uint128_to_uint256 z in
      let x_mul_y256 = builtin mul x256 y256 in
      let res256 = builtin div x_mul_y256 z256 in
      let ores128 = builtin to_uint128 res256 in
      match ores128 with
      | None =>
        
        let max_uint128 = Uint128 340282366920938463463374607431768211455 in
        let fourtytwo128 = Uint128 42 in
        builtin mul max_uint128 fourtytwo128
      | Some res128 =>
        res128
      end


let sub_percentage_of_amt: Uint128 -> Uint128 -> Uint128Pair =
    fun (amount: Uint128) => fun (commission_numerator: Uint128) =>
    let commission = muldiv amount commission_numerator discount_denominator in
    let amount_sub_commission = builtin sub amount commission in
    let res = Uint128Pair amount_sub_commission commission in
    res

type SpinClaim =
| SpinClaim of Uint128 Uint128 Uint128 ByStr64

type Signable =
| Signable of ByStr20 Uint128 Uint128 Uint128 ByStr20

type HashableArg =
| B of ByStr20
| U of Uint128

let hash_signable_arg: HashableArg -> ByStr32 =
    fun(s: HashableArg)=> 
    match s with
    | B a => builtin sha256hash a
    | U a => builtin sha256hash a
    end

let hash_concat: ByStr -> HashableArg -> ByStr =
    fun(prefix: ByStr) => fun(suffix: HashableArg) =>
    let bystr_32 = hash_signable_arg suffix in
    let bystr = builtin to_bystr bystr_32 in
    builtin concat prefix bystr


let signable_to_cheque_hash: Signable -> ByStr =
    fun(args: Signable) =>
        match args with
            | Signable b0 u0 u1 u2 b1 =>
            let c0 = let a0 = B  b0 in hash_concat zeroByStr a0 in
            let c1 = let a1 = U  u0 in hash_concat        c0 a1 in
            let c2 = let a2 = U  u1 in hash_concat        c1 a2 in
            let c3 = let a3 = U  u2 in hash_concat        c2 a3 in
            let c4 = let a4 = B  b1 in hash_concat        c3 a4 in
                c4
        end

let optional_uint128: Option Uint128 -> Uint128 =
    fun(o: Option Uint128) =>
    match o with | None => zero | Some s => s end

let empty_uint128_uint128_map = Emp Uint128 Uint128

contract SlotMachine(
    init_admin_pubkey: ByStr33,
    init_fee_addr: ByStr20,
    init_ticket_price: Uint128,
    init_fee_cut: Uint128
)

field players_spins: Map ByStr20 Uint128 = Emp ByStr20 Uint128
field players_claimed:  Map ByStr20 Uint128 = Emp ByStr20 Uint128
field admin: ByStr20 = builtin schnorr_get_address init_admin_pubkey
field admin_pubkey: ByStr33 = init_admin_pubkey 
field staging_admin_pubkey: Option ByStr33 = None {ByStr33}


field win_tiers: Map Uint128 Uint128 = empty_uint128_uint128_map
field fee_addr: ByStr20 = init_fee_addr
field ticket_price: Uint128 = init_ticket_price
field fee_cut: Uint128 = init_fee_cut

field tmp_ticket_amt: Uint128 = zero

field void_cheques: Map ByStr32 Bool = Emp ByStr32 Bool
field tmp_target: ByStr20 = zeroByStr20

procedure ThrowError(err: Error)
    e = make_error err;
    throw e
end
procedure IsAdmin()
    tmp <- admin;
    is_admin = builtin eq tmp _sender;
    match is_admin with
    | False => e = NotAuthorized; ThrowError e
    | True =>
    end 
end
procedure SendZil(beneficiary: ByStr20, amt: Uint128)
    msg = let m = { 
        _tag: "AddFunds";
        _recipient: beneficiary;
        _amount: amt
    } in one_msg m;
    send msg
end
procedure DoVoidCheque(cheque_hash: ByStr)
    hash = builtin sha256hash cheque_hash;
    void_cheques[hash] := true
end
procedure AssertChequeHashValid(cheque_hash: ByStr)
    hash = builtin sha256hash cheque_hash;
    cheque_invalid <- exists void_cheques[hash];
    match cheque_invalid with 
        | False =>
        | True => e = InvalidCheque; ThrowError e
    end
end

transition SetStagedAdmin(staged: ByStr33)
    IsAdmin;
    opt_staged = Some {ByStr33} staged;
    staging_admin_pubkey := opt_staged
end
transition ClaimStagedAdmin()
    option_staged <- staging_admin_pubkey;
    match option_staged with
    | None => e = NoStagedAdmin; ThrowError e
    | Some staged_pubkey =>
        staged = builtin schnorr_get_address staged_pubkey;
        staged_is_sender = builtin eq _sender staged;
        match staged_is_sender with
        | False => e = NotAuthorized; ThrowError e
        | True => 
            admin := staged;
            admin_pubkey := staged_pubkey
        end
    end
end

procedure SetWinTier(tier: Uint128Pair)
    match tier with
    | Uint128Pair cur_tier amt =>
        win_tiers[cur_tier] := amt
    end
end


transition SetWinTiers(tiers: List Uint128Pair)
    IsAdmin;
    win_tiers := empty_uint128_uint128_map;
    forall tiers SetWinTier
end


transition Send(to: ByStr20, amt: Uint128)
    IsAdmin;
    SendZil to amt
end

transition UpdateFeeAddr(new: ByStr20)
    IsAdmin;
    fee_addr := new
end

transition UpdateTicketPrice(new: Uint128)
    IsAdmin;
    ticket_price := new
end

transition UpdateFeeCut(new: Uint128)
    IsAdmin;
    fee_cut := new
end



procedure AcceptAsTickets()
    cur_balance <- _balance;
    accept;
    accepted_balance <- _balance;
    gain = builtin sub accepted_balance cur_balance;
    price <- ticket_price;
    to_send_back = builtin rem gain price;
    ticket_num = builtin div gain price;
    is_zero_tickets = builtin eq ticket_num zero;
    match is_zero_tickets with
    | True => e = NotEnoughZILSent; ThrowError e
    | False =>
        
        tmp_ticket_amt := ticket_num;
        is_zero_to_send_back = builtin eq to_send_back zero;
        match is_zero_to_send_back with
        | True => 
        | False =>
            
            SendZil _sender to_send_back
        end
    end
end

procedure GiveTickets(to: ByStr20, amt: Uint128)
    maybe_spins <- players_spins[to];
    spins = optional_uint128 maybe_spins;
    spins_added = builtin add spins amt;
    players_spins[to] := spins_added
end

procedure AssertChequeValidityAndVoidIt(cheque_hash: ByStr, pubkey: ByStr33, signature: ByStr64)
    AssertChequeHashValid cheque_hash;
    valid_sig = builtin schnorr_verify pubkey cheque_hash signature;
    match valid_sig with
        | True =>
            
            DoVoidCheque cheque_hash
        | False => e = InvalidSignature; ThrowError e
    end
end
procedure AssertIsAdminSignatureAndVoidIt(signable: Signable, signature: ByStr64)
    cheque_hash = signable_to_cheque_hash signable;
    admin_pub_temp <- admin_pubkey;
    AssertChequeValidityAndVoidIt cheque_hash admin_pub_temp signature
end
procedure IncrementClaim(target: ByStr20)
    maybe_ticket_max <- players_spins[target];
    ticket_max = optional_uint128 maybe_ticket_max;
    
    maybe_claimed_index <- players_claimed[target];
    claimed_index = optional_uint128 maybe_claimed_index;
    claimed_incremented = builtin add claimed_index one;
    
    claim_is_bigger = uint128_gt claimed_incremented ticket_max;
    match claim_is_bigger with
    | True => e = CannotClaimMoreThanMax; ThrowError e
    | False =>
        players_claimed[target] := claimed_incremented
    end
end

procedure AssertDiscountNotBiggerThanMax(d: Uint128)
    is_bigger = uint128_gt d discount_denominator;
    match is_bigger with
    | True => e = DiscountTooBig; ThrowError e
    | False =>
    end
end


procedure SendWinnings(target: ByStr20, win_tier: Uint128, amt: Uint128, fee: Uint128)
    e = {_eventname : "Won"; target: target; amt: amt; win_tier: win_tier; fee_nominator: fee};
    event e;
    SendZil target amt
end


procedure PayFee(amt: Uint128)
    fund <- fee_addr;
    SendZil fund amt
end


procedure PayOutReward(target: ByStr20, win_tier: Uint128, discount: Uint128)
    maybe_win_amt <- win_tiers[win_tier];
    match maybe_win_amt with
    | None => e = UnknownRewardTier; ThrowError e
    | Some win_amt =>
        is_zero = builtin eq win_amt zero;
        match is_zero with
        | True => 
        | False =>
            
            AssertDiscountNotBiggerThanMax discount;
            discount_is_max = builtin eq discount discount_denominator;
            match discount_is_max with
            | True => SendWinnings target win_tier win_amt zero
            | False =>
                fee_cut_local <- fee_cut;
                res1 = sub_percentage_of_amt fee_cut_local discount;
                match res1 with
                | Uint128Pair fee_discounted asdf =>
                    result = sub_percentage_of_amt win_amt fee_discounted;
                    match result with
                    | Uint128Pair reward fee =>
                        SendWinnings target win_tier reward fee_discounted;
                        PayFee fee
                    end
                end
            end
        end
    end
end

transition AddFunds()
    AcceptAsTickets;
    
    ticket_amt <- tmp_ticket_amt;
    tmp_ticket_amt := zero;
    GiveTickets _sender ticket_amt;
    
    e = {_eventname : "BoughtTickets"; sender: _sender; ticket_amt: ticket_amt};
    event e
end

procedure ClaimSpin(spin: SpinClaim)
    target <- tmp_target;
    match spin with
    | SpinClaim discount spin_num win_tier signature =>
        signable = Signable target discount spin_num win_tier _this_address;
        AssertIsAdminSignatureAndVoidIt signable signature;
        
        
        IncrementClaim target;
        PayOutReward target win_tier discount
    end
end


transition ClaimSpins(target: ByStr20, spins: List SpinClaim)
    tmp_target := target;
    forall spins ClaimSpin
end
`;

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

export const SlotMachine = (resolvers: SDKResolvers) => {
  const logUrl = (id: string, msg: string) => {
    const network = getNetworkName();
    console.log(MAGENTA, msg);
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
        if (receipt.errors) {
          Object.entries(receipt.errors).map(([k, v]) => {
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
            e.params.forEach((p) =>
              console.log(CYAN, `${p.vname}: ${p.value}`)
            );
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
      __init_admin_pubkey: T.ByStr33,
      __init_fee_addr: T.ByStr20,
      __init_ticket_price: T.Uint128,
      __init_fee_cut: T.Uint128
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
            type: `ByStr33`,
            vname: `init_admin_pubkey`,
            value: __init_admin_pubkey.toSend(),
          },
          {
            type: `ByStr20`,
            vname: `init_fee_addr`,
            value: __init_fee_addr.toSend(),
          },
          {
            type: `Uint128`,
            vname: `init_ticket_price`,
            value: __init_ticket_price.toSend(),
          },
          {
            type: `Uint128`,
            vname: `init_fee_cut`,
            value: __init_fee_cut.toSend(),
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
        | "players_spins"
        | "players_claimed"
        | "admin"
        | "admin_pubkey"
        | "staging_admin_pubkey"
        | "win_tiers"
        | "fee_addr"
        | "ticket_price"
        | "fee_cut"
        | "tmp_ticket_amt"
        | "void_cheques"
        | "tmp_target"
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
            init_admin_pubkey: any;
            init_fee_addr: any;
            init_ticket_price: any;
            init_fee_cut: any;
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
     * 0xc0420baf5e3c128496dab69934fcdca17cd69619f0ff802319bd4d72a50e2481
     */
    calls: (a: T.ByStr20) => (gasLimit: Long) => {
      const signer = signTransition(a);
      return {
        SetStagedAdmin: (__staged: T.ByStr33) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `SetStagedAdmin`,
            data: [
              {
                type: `ByStr33`,
                vname: `staged`,
                value: __staged.toSend(),
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

        ClaimStagedAdmin: () => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `ClaimStagedAdmin`,
            data: [],
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

        SetWinTiers: (__tiers: T.List<T.CustomADT<[T.Uint128, T.Uint128]>>) => {
          __tiers.setContractAddress(a);
          __tiers.setADTname("Uint128Pair");
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `SetWinTiers`,
            data: [
              {
                type: `List (${a.toSend().toLowerCase()}.Uint128Pair)`,
                vname: `tiers`,
                value: __tiers.toSend(),
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

        Send: (__to: T.ByStr20, __amt: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `Send`,
            data: [
              {
                type: `ByStr20`,
                vname: `to`,
                value: __to.toSend(),
              },
              {
                type: `Uint128`,
                vname: `amt`,
                value: __amt.toSend(),
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

        UpdateFeeAddr: (__new: T.ByStr20) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `UpdateFeeAddr`,
            data: [
              {
                type: `ByStr20`,
                vname: `new`,
                value: __new.toSend(),
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

        UpdateTicketPrice: (__new: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `UpdateTicketPrice`,
            data: [
              {
                type: `Uint128`,
                vname: `new`,
                value: __new.toSend(),
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

        UpdateFeeCut: (__new: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `UpdateFeeCut`,
            data: [
              {
                type: `Uint128`,
                vname: `new`,
                value: __new.toSend(),
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

        AddFunds: (amount: T.Uint128) => {
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `AddFunds`,
            data: [],
            amount: amount.value.toString(),
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

        ClaimSpins: (
          __target: T.ByStr20,
          __spins: T.List<
            T.CustomADT<[T.Uint128, T.Uint128, T.Uint128, T.ByStr64]>
          >
        ) => {
          __spins.setContractAddress(a);
          __spins.setADTname("SpinClaim");
          const transactionData = {
            isDeploy: false,
            ...sig,
            contractAddress: a.toSend(),
            contractTransitionName: `ClaimSpins`,
            data: [
              {
                type: `ByStr20`,
                vname: `target`,
                value: __target.toSend(),
              },
              {
                type: `List (${a.toSend().toLowerCase()}.SpinClaim)`,
                vname: `spins`,
                value: __spins.toSend(),
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
