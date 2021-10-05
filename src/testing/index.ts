import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { Account, Transaction } from "@zilliqa-js/account";
import { Zilliqa } from "@zilliqa-js/zilliqa";

type TXLog = (t: Transaction, msg: string) => void;

interface SDKResolvers {
  getZil: (
    requireSigner?: boolean
  ) => Promise<{ zil: Zilliqa; teardown: () => Promise<void> }>;
  getVersion: () => number;
  getNetworkName: () => string;
  txLog?: TXLog;
}

export const sleep = (milis: number) =>
  new Promise<void>((res) => setTimeout(res, milis));

const exe = (command: string) =>
  new Promise<string>((res, rej) => {
    exec(command, (error, stdout, stderr) => {
      if (error) rej(error);
      res(stdout);
    });
  });
const serverPath = path.resolve(__dirname, "./tmp_server");
export const isolatedServer = {
  mockConfig: {
    networkname: "isolated",
    version: "14548995",
    nodeurl: "http://localhost:5555",
  },
  submitterPrivateKey:
    "e53d1c3edaffc7a7bab5418eb836cf75819a82872b4a1a0f1c7fcf5c3e020b89",
  otherKeys: {
    second: {
      bystr20: "0x6cd3667ba79310837e33f0aecbe13688a6cbca32",
      privateKey:
        "b87f4ba7dcd6e60f2cca8352c89904e3993c5b2b0b608d255002edcda6374de4",
    },
  },
  start: async () => {
    if (!fs.existsSync(serverPath)) {
      console.log("Downloading isolated server ...");
      await exe(
        `git clone https://github.com/Zilliqa/zilliqa-isolated-server.git ${serverPath}`
      );
    }
    console.log("Building isolated server ...");
    await exe(
      `cd ${serverPath} && docker build --rm -f "Dockerfile" -t isolatedserver:1 "." -t tmp_server`
    );
    console.log("Running isolated server ...");
    await exe(`docker run -d -p 5555:5555 -t tmp_server`);
    console.log("Waiting 3 sec for the isolated server to set up");
    await sleep(3000);
  },
  kill: async () => {
    console.log("Killing the last created docker container ...");
    const container = (await exe("docker ps -lq")).trim();
    await exe(`docker kill ${container}`);
    await exe(`docker rm ${container}`);
  },
};

/**
 * isolated server resolvers from account
 */
export function getResolversFromAccount(a: Account) {
  const c = isolatedServer.mockConfig;
  const version = c.version;
  const resolvers: SDKResolvers = {
    getZil: async (signer) => {
      let teardown = async () => {};
      const zil = new Zilliqa(c.nodeurl);
      if (signer) {
        zil.wallet.addByPrivateKey(a.privateKey);
        teardown = async () => {};
      }
      return { zil, teardown };
    },
    getVersion: () => parseInt(version),
    getNetworkName: () => c.networkname,
  };
  return resolvers;
}
