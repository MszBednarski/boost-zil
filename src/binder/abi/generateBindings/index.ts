import { ABI } from "./interfaces";
import { buildDeploy } from "./deploy";
import { buildTransitions } from "./transition";
import { boilerplate } from "./boilerplate";
import { stateGetter } from "./stateGetter";
import { setABI, getImports, addImport } from "./getters";
import { removeComments } from "./shared";
import { ScillaString } from "../../..";

export function generateBindings(
  abi: string,
  code: string,
  options: { makeSigners: boolean; "custom-boost-zil-path"?: string }
) {
  const a = JSON.parse(abi) as ABI;
  setABI(a);
  const sourceCodeHash = new ScillaString(code).toHash();
  const deployCode = buildDeploy(code, sourceCodeHash);
  const transitions = buildTransitions(code, options.makeSigners);

  const boostZilPath = options["custom-boost-zil-path"]
    ? options["custom-boost-zil-path"]
    : "boost-zil";

  addImport(
    `import { BN, Long } from "@zilliqa-js/util";`,
    `import { Transaction, TxParams } from "@zilliqa-js/account";`,
    `import { Contract } from "@zilliqa-js/contract";`,
    `import * as T from "${boostZilPath}"`,
    `import { signTransition } from "${boostZilPath}";`,
    `import { Zilliqa } from "@zilliqa-js/zilliqa";`,
    `import {ContractSubStateQueryCast, partialState } from "${boostZilPath}"`
  );
  const imports = getImports();

  return {
    sdkCode: `
${imports.join("\n")}

/**
 * this string is the signature of the hash of the source code
 * that was used to generate this sdk
 */
export const contractSignature = "hash_${sourceCodeHash}";
const sig: {
  contractSignature: "hash_${sourceCodeHash}";
} = { contractSignature };

export const code = \`
(* sourceCodeHash=${sourceCodeHash} *)
(* sourceCodeHashKey=hash_${sourceCodeHash} *)
${removeComments(code)}\`

${boilerplate}

export const ${a.contract_info.vname} = (resolvers: SDKResolvers) => {
  const logUrl = (id: string, msg: string) => {
    const network = getNetworkName();
    console.log(MAGENTA, msg + " 🔥");
    if (network == "mainnet" || network == "testnet") {
      const url = \`https://viewblock.io/zilliqa/tx/0x\${id}?network=\${network}\`;
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
          console.log(CYAN, \`Events🕵️‍♀️\`);
          events.forEach((e) => {
            console.log(CYAN, \`\${e._eventname}\`);
            e.params.forEach((p) =>
           {
             console.log(CYAN, \`\${p.vname}: \`)
             console.log(MAGENTA, \`\${JSON.stringify(p.value, null, 2)}\`)
            }
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
    const {
      getZil,
      getVersion,
      getNetworkName,
    } = resolvers;
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

${deployCode},

${stateGetter()}

  /**
   * interface for scilla contract with source code hash:
   * ${sourceCodeHash}
  */
  calls: (a: T.ByStr20) => (gasLimit: Long) => {
    const signer = signTransition(a);
    return {${transitions.built}}
  }
}
}
`,
    documentation: transitions.documentation,
  };
}
