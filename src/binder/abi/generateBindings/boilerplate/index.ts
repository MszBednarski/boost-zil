export const boilerplate = `

export type TXLog = (t: Transaction, msg: string) => void;

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
      31,
      1000
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
  } catch(e) {
    if (teardownFun) {
      await teardownFun();
    }
    throw e;
  }
  throw "this never happens leave me alone ts"
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
      31,
      1000
    );
    await teardown();
    txLink(tx, t.contractTransitionName);
    return { tx };
    } catch(e) {
      if(teardownFun){
        await teardownFun();
      }
      throw e;
    }
    throw "this never happens leave me alone ts"
  };


export interface SDKResolvers {
  getZil: (
    requireSigner?: boolean
  ) => Promise<{ zil: Zilliqa; teardown: () => Promise<void> }>;
  getVersion: () => number;
  getNetworkName: () => string;
  txLog?: TXLog;
}


const RED = "\\x1B[31m%s\\x1b[0m";
const CYAN = "\\x1B[36m%s\\x1b[0m";
const GREEN = "\\x1B[32m%s\\x1b[0m";
const MAGENTA = "\\x1B[35m%s\\x1b[0m";

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
`;
