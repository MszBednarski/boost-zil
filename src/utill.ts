import * as schnorr from "./schnorr";
import { Account } from "@zilliqa-js/account";
import { Signable } from "./signable/shared";
import { ByStr20, ByStr64 } from "./signable/bystr";
import { ScillaString, Uint128 } from "./signable";
import {
  fromBech32Address,
  toChecksumAddress,
  Zilliqa,
} from "@zilliqa-js/zilliqa";
import { validation } from "@zilliqa-js/util";
import { SDKResolvers } from ".";

export const normaliseAddress = (address: string): string => {
  if (validation.isBech32(address)) {
    return fromBech32Address(address);
  }

  if (!validation.isAddress(address.replace("0x", ""))) {
    throw Error(
      "Wrong address format, should be either bech32 or checksummed address"
    );
  }

  return toChecksumAddress(address);
};

/**
 * sign
 *
 * @param {string} hash - hex-encoded hash of the data to be signed
 *
 * @returns {string} the signature
 */
const sign = (msg: Buffer, privateKey: string, pubKey: string): string => {
  const sig = schnorr.sign(
    msg,
    Buffer.from(privateKey, "hex"),
    Buffer.from(pubKey, "hex")
  );

  let r = sig.r.toString("hex");
  let s = sig.s.toString("hex");
  while (r.length < 64) {
    r = "0" + r;
  }
  while (s.length < 64) {
    s = "0" + s;
  }

  return r + s;
};

export function signWithAccount(cheque_hash: string, acc: Account) {
  return new ByStr64(
    `0x${sign(
      Buffer.from(cheque_hash.replace("0x", ""), "hex"),
      acc.privateKey,
      acc.publicKey
    )}`
  );
}

/**
 *
 * @param cheque_hash starts with 0x or not
 * @param signature starts with 0x or not
 * @param pubkey starts with 0x or not
 * @returns if valid
 */
export function verifySignature(
  cheque_hash: string,
  signature: string,
  pubkey: string
) {
  return schnorr.verify(
    Buffer.from(cheque_hash.replace("0x", ""), "hex"),
    schnorr.toSignature(signature.replace("0x", "")),
    Buffer.from(pubkey.replace("0x", ""), "hex")
  );
}

export function concatHashed(...hashes: string[]): string {
  return `0x${hashes.reduce((prev, cur) => prev + cur.replace("0x", ""), "")}`;
}

export function getHashed<T extends Signable[]>(
  ...hashes: T
): { chequeHash: string; args: [...T] } {
  return {
    args: hashes,
    chequeHash: concatHashed(...hashes.map((a) => a.toHash())),
  };
}

/**
 * @dev signs the args in order like in the contracts implementation
 * appending the contract address | _this_address at the end of the sig payload
 */
export const signWithContractAddress: (
  contractAddress: ByStr20
) => (
  account: Account
) => <T extends Signable[]>(...args: T) => [...T, ByStr64] =
  (addr) =>
  (acc) =>
  (...args) => {
    const res = getHashed(...args, addr);
    const signature = signWithAccount(res.chequeHash, acc);
    return [...args, signature];
  };

/**
 * @dev signs the args in order like in the contracts implementation
 * appending the nonce transition name _this_address at the end of the sig payload
 */
export const signTransition: (contractAddress: ByStr20) => (
  transitionName: string
) => (account: Account) => <T extends Signable[]>(
  ...args: T
) => {
  args: [...T, Uint128, ByStr64];
  chequeHash: string;
} =
  (addr) =>
  (name) =>
  (acc) =>
  (...args) => {
    const nonce = Uint128.getRandom();
    const { chequeHash } = getHashed(
      ...args,
      nonce,
      new ScillaString(name),
      addr
    );
    const signature = signWithAccount(chequeHash, acc);
    return {
      args: [...args, nonce, signature],
      chequeHash,
    };
  };

/**
 * returns resolvers to mainnet
 * @param a optional zilliqa account
 * @returns
 */
export function getMainnetResolvers(a?: Account) {
  const c = {
    nodeurl: "https://api.zilliqa.com/",
    version: "65537",
    networkname: "mainnet",
  };
  const getZil = a
    ? async (signer?: boolean) => {
        let teardown = async () => {};
        const zil = new Zilliqa(c.nodeurl);
        if (signer) {
          zil.wallet.addByPrivateKey(a.privateKey);
          teardown = async () => {};
        }
        return { zil, teardown };
      }
    : async () => {
        const teardown = async () => {};
        const zil = new Zilliqa(c.nodeurl);
        return { zil, teardown };
      };

  const resolvers: SDKResolvers = {
    getZil,
    getVersion: () => parseInt(c.version),
    getNetworkName: () => c.networkname,
  };
  return resolvers;
}
