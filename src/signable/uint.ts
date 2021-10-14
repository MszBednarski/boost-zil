import { BN, units } from "@zilliqa-js/util";
import { Signable, sha256 } from "./shared";
import randomBytes from "randombytes";
import Big from "big.js";

abstract class UintSignable extends Signable {
  value: BN;
  constructor(v: string | BN) {
    super();
    this.value = new BN(v);
  }
  asBN() {
    return this.value;
  }
}

export class Uint32 extends UintSignable {
  type = "Uint32";
  constructor(v: string | BN) {
    super(v);
  }
  toHash() {
    return sha256(this.value.toString("hex", 8));
  }
  toSend() {
    return this.value.toString();
  }
}

export class Uint128 extends UintSignable {
  type = "Uint128";
  constructor(v: string | BN) {
    super(v);
  }
  toHash() {
    return sha256(this.value.toString("hex", 32));
  }
  toSend() {
    return this.value.toString();
  }
  static getRandom() {
    return new Uint128(new BN(randomBytes(16).toString("hex"), "hex"));
  }
  static zil(v: string | BN) {
    return new Uint128(units.toQa(v, units.Units.Zil));
  }
  /**
   *
   * @param fraction the string representing a fraction delimited with a "."
   * example: 0.04
   * @param decimals the number of decimals the target number represented has
   * example: 0.04 decimals 12 would result in:
   * 40 000 000 000
   */
  static fromFraction(fraction: string, decimals: number) {
    const frac = new Big(fraction);
    const target = frac.mul(new Big(10).pow(decimals));
    return new Uint128(target.toFixed(0));
  }
  /**
   *
   * @param str the string or Uint128 from the blockchain
   * @param decimals the decimals in the string that represents some token§
   * @param precision the precision of the fraction that the output string represents
   */
  static fromStringtoFraction(
    str: string,
    decimals: number,
    precision: number = 3
  ) {
    const b = new Big(str).div(new Big(10).pow(decimals));
    return b.toFixed(precision);
  }
}

export class Uint256 extends UintSignable {
  type = "Uint256";
  constructor(v: string | BN) {
    super(v);
  }
  toHash() {
    return sha256(this.value.toString("hex", 64));
  }
  toSend() {
    return this.value.toString();
  }
}
