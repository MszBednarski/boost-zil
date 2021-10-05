import { Zilliqa, BN, Long } from "@zilliqa-js/zilliqa";
import { Transaction } from "@zilliqa-js/account";
import { ByStr20, ByStr33, Uint128 } from "./signable";

export const MAGENTA = "\x1B[35m%s\x1b[0m";

/**
 * create an account using Zilliqa
 */
export function createAccount() {
  const zil = new Zilliqa("");
  const addr = zil.wallet.create();
  const account = zil.wallet.accounts[addr];
  const address = new ByStr20(addr);
  const pubkey = new ByStr33(account.publicKey);
  return { account, address, pubkey };
}

/**
 * get min gas price return already as BN
 */
export async function getMinGasPrice(zil: Zilliqa) {
  const res = await zil.blockchain.getMinimumGasPrice();
  if (!res.result) {
    throw "no gas price";
  }
  return { gasPrice: new BN(res.result) };
}

export type TXLog = (t: Transaction, msg: string) => void;

export interface SDKResolvers {
  getZil: (
    requireSigner?: boolean
  ) => Promise<{ zil: Zilliqa; teardown: () => Promise<void> }>;
  getVersion: () => number;
  getNetworkName: () => string;
  txLog?: TXLog;
}

export async function sendZIL(
  resolvers: SDKResolvers,
  to: ByStr20,
  amt: Uint128
) {
  const { zil, teardown } = await resolvers.getZil(true);
  const gasLimit = Long.fromString("20000");
  const { gasPrice } = await getMinGasPrice(zil);
  try {
    const tx = await zil.blockchain.createTransaction(
      await zil.transactions.payment({
        gasLimit,
        gasPrice,
        toAddr: to.toSend(),
        amount: new BN(amt.toSend()),
        version: resolvers.getVersion(),
      }),
      31,
      1000
    );
    console.log(MAGENTA, `🤑 Sent ZIL ${to.toSend()}`);
    return tx;
  } catch (e) {
    await teardown();
    throw e;
  }
}
