import { ByStr20, ByStr33, createAccount, Uint128 } from "boost-zil";
import { Account } from "@zilliqa-js/account";
import { isolatedServer, getResolversFromAccount } from "../src/testing";
import { SlotMachine } from "./SlotMachine/build/bind";
import { Long } from "@zilliqa-js/zilliqa";
import { sendZIL, SDKResolvers } from "../src/";

let admin: ByStr20;
let adminPubKey: ByStr33;
let adminAcc: Account;
let slotMachine: ReturnType<typeof SlotMachine>;
let fundingAccount: ReturnType<typeof createAccount>;
let resolvers: SDKResolvers;

const limit = Long.fromString("60000");

describe("on blockchain", async () => {
  before(async () => {
    await isolatedServer.start();
    adminAcc = new Account(isolatedServer.submitterPrivateKey);
    admin = new ByStr20(adminAcc.address);
    adminPubKey = new ByStr33(adminAcc.publicKey);
    resolvers = getResolversFromAccount(adminAcc);
    slotMachine = SlotMachine(resolvers);
    fundingAccount = createAccount();
  });
  after(async () => {
    await isolatedServer.kill();
  });
  it("works lol", async () => {
    const { address } = await slotMachine
      .deploy(
        limit,
        adminPubKey,
        fundingAccount.address,
        Uint128.zil("10"),
        new Uint128("1000")
      )
      .send();

    await slotMachine.calls(address)(limit).AddFunds(Uint128.zil("34")).send();

    await sendZIL(resolvers, createAccount().address, Uint128.zil("10"));
  });
});
