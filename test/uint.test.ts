import { expect } from "chai";
import { Uint128 } from "../src";

describe("uint128", () => {
  it("from fraction works", () => {
    const frac = Uint128.fromFraction("0.34", 12);
    expect(frac.toSend()).to.be.equal("340000000000");
  });
  it("from string to fraction works", () => {
    const str = Uint128.fromStringtoFraction("340000000000", 12, 2);
    expect(str).to.be.equal("0.34");
  });
  it("util frontend methods work", () => {
    const twoGzil = Uint128.fromFraction("2", 15);
    twoGzil.setTokenInfo({ symbol: "GZIL", decimals: 15, precision: 3 });

    const threeGzil = Uint128.fromFractionUint128(twoGzil, "3.5");

    expect(threeGzil.toSend()).to.be.equal("3500000000000000");
    expect(threeGzil.getReadable()).to.be.equal("3.500");
    expect(twoGzil.getReadable()).to.be.equal("2.000");
  });
});
