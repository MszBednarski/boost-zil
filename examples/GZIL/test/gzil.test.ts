import {
  ByStr20,
  ByStr33,
  createAccount,
  Uint128,
  Uint32,
  ScillaString,
  SDKResolvers,
} from "boost-zil";
import { Account } from "@zilliqa-js/account";
import { isolatedServer, getResolversFromAccount } from "boost-zil/lib/testing";
import { GZIL } from "../src/SmartContract/build/bind";
import { Long } from "@zilliqa-js/zilliqa";
import { expect } from "chai";

let admin: ByStr20;
let adminPubKey: ByStr33;
let adminAcc: Account;
let gzil: ReturnType<typeof GZIL>;
let resolvers: SDKResolvers;

const limit = Long.fromString("60000");

describe("on blockchain", async () => {
  before(async () => {
    await isolatedServer.start();
    adminAcc = new Account(isolatedServer.submitterPrivateKey);
    admin = new ByStr20(adminAcc.address);
    adminPubKey = new ByStr33(adminAcc.publicKey);
    resolvers = getResolversFromAccount(adminAcc);
    gzil = GZIL(resolvers);
  });
  after(async () => {
    await isolatedServer.kill();
  });
  it("gzil", async () => {
    const transferTarget = createAccount();
    const { address } = await gzil
      .deploy(
        limit,
        admin,
        admin,
        new ScillaString("GZIL"),
        new ScillaString("GZIL"),
        new Uint32("15"),
        // 500k gzil
        Uint128.fromFraction("500000", 15),
        new Uint128("100000")
      )
      .send();

    const gzilCall = gzil.calls(address)(limit);

    const twoGzil = Uint128.fromFraction("2", 15);
    const twoThirdGzil = Uint128.fromFraction("0.66", 15);

    await gzilCall.Transfer(transferTarget.address, twoGzil).send();

    const mintTarget = createAccount();

    await gzilCall.Mint(mintTarget.address, twoThirdGzil).send();

    const [state] = await gzil
      .state(
        {
          balances: {
            [mintTarget.address.lowerCase()]: "*",
            [transferTarget.address.lowerCase()]: "*",
          },
        },
        "false"
      )
      .get(address);

    expect(state.balances[mintTarget.address.lowerCase()]).to.be.eq(
      twoThirdGzil.toSend()
    );
    expect(state.balances[transferTarget.address.lowerCase()]).to.be.eq(
      twoGzil.toSend()
    );
  });
});
