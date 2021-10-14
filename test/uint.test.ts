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
});
