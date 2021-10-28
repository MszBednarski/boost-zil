import { expect } from "chai";
import { mappedPartialState, ByStr20, getMainnetResolvers } from "../src";

describe("mapped partial state", () => {
  it("can fetch multiple contracts", async () => {
    const ssn = new ByStr20("zil15lr86jwg937urdeayvtypvhy6pnp6d7p8n5z09");
    const gzil = new ByStr20("zil14pzuzq6v6pmmmrfjhczywguu0e97djepxt8g3e");
    const zilswap = new ByStr20("zil1hgg7k77vpgpwj3av7q7vv5dl4uvunmqqjzpv2w");

    const someAddr = new ByStr20("zil1j83qe5aev3nujwjvru70ewt996a2x57l03n6tj");
    const bigGzilHodler = new ByStr20(
      "zil1ajs40wuh3c3jw6dl0yevcrchzz5es4azylh6kd"
    );
    const ignite = new ByStr20("0xaf0fd17f10a26573597ee823b3c47301d0af1d5a");

    const stateGetter = mappedPartialState(getMainnetResolvers().getZil);
    const state = await stateGetter(
      {
        contractAddress: ssn,
        query: { deposit_amt_deleg: { [someAddr.lowerCase()]: "*" } },
      },
      {
        contractAddress: gzil,
        query: { balances: { [bigGzilHodler.lowerCase()]: "*" } },
      },
      {
        contractAddress: zilswap,
        query: { pools: { [gzil.lowerCase()]: "*" } },
      },
      { contractAddress: ignite, query: {}, includeBalance: "true" }
    );
    console.log(state);
    expect(
      typeof state[ssn.toBech32()].deposit_amt_deleg[someAddr.lowerCase()] !=
        "undefined"
    ).to.be.true;
    expect(
      typeof state[gzil.toBech32()].balances[bigGzilHodler.lowerCase()] !=
        "undefined"
    ).to.be.true;
    expect(
      typeof state[zilswap.toBech32()].pools[gzil.lowerCase()] != "undefined"
    ).to.be.true;
  });
});
