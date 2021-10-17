import {
  ByStr20,
  ByStr33,
  createAccount,
  Uint128,
  Uint32,
  ScillaString,
  Uint256,
  BNum,
  SDKResolvers,
} from "boost-zil";
import { Account } from "@zilliqa-js/account";
import { isolatedServer, getResolversFromAccount } from "boost-zil/lib/testing";
import { GZIL } from "../src/GZIL/build/bind";
import { ZilSwap } from "../src/SmartContract/build/bind";
import { Long } from "@zilliqa-js/zilliqa";
import { expect } from "chai";
import Big from "big.js";

let admin: ByStr20;
let adminAcc: Account;
let gzil: ReturnType<typeof GZIL>;
let zilswap: ReturnType<typeof ZilSwap>;
let resolvers: SDKResolvers;

const limit = Long.fromString("60000");

describe("on blockchain", async () => {
  before(async () => {
    await isolatedServer.start();
    adminAcc = new Account(isolatedServer.submitterPrivateKey);
    admin = new ByStr20(adminAcc.address);
    resolvers = getResolversFromAccount(adminAcc);
    gzil = GZIL(resolvers);
    zilswap = ZilSwap(resolvers);
  });
  after(async () => {
    await isolatedServer.kill();
  });
  it("gzil", async () => {
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

    const { address: zilswapAddr } = await zilswap
      .deploy(limit, admin, new Uint256("30"))
      .send();

    const gzilCall = gzil.calls(address)(limit);
    const zilswapCall = zilswap.calls(zilswapAddr)(limit);
    const fiftyGzil = Uint128.fromFraction("50", 15);

    await gzilCall.IncreaseAllowance(zilswapAddr, fiftyGzil).send();

    // gzil is worth ~1000 zil right?
    await zilswapCall
      .AddLiquidity(
        Uint128.zil("50000"),
        address,
        fiftyGzil,
        fiftyGzil,
        new BNum("32423423")
      )
      .send();

    const targetAddr = createAccount();

    await zilswapCall
      .SwapExactZILForTokens(
        Uint128.zil("100"),
        address,
        Uint128.fromFraction("0.08", 15),
        new BNum("234234"),
        targetAddr.address
      )
      .send();

    const [state] = await gzil
      .state(
        {
          balances: {
            [targetAddr.address.lowerCase()]: "*",
          },
        },
        "false"
      )
      .get(address);

    // expect at least 0.08 gzil for 100 zils
    expect(
      new Big(state.balances[targetAddr.address.lowerCase()] as string).gt(
        Uint128.fromFraction("0.08", 15).asBig()
      )
    ).to.be.eq(true);
  });
});
