import { Zilliqa, BN } from "@zilliqa-js/zilliqa";
import { ByStr20, ByStr33 } from "./signable";

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
