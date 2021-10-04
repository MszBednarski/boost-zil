#!/usr/bin/env node
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { buildBind } from "./build";
import { getPkgJsonDir } from "./shared";

async function main() {
  const rootDir = await getPkgJsonDir();
  const boostZilPath = resolve(rootDir, "./boost-zil.json");
  if (!existsSync(boostZilPath)) {
    throw new Error(`Missing boost-zil.json in root dir ${rootDir}`);
  }
  const boostZil = JSON.parse(readFileSync(boostZilPath, "utf-8")) as {
    contracts: string[];
    makeSigners: boolean;
    "custom-boost-zil-path": string;
  };

  for (const contractPath of boostZil.contracts) {
    // can only build one at a time atm due to global abi getter
    await buildBind(resolve(rootDir, contractPath), boostZil);
  }
}

if (require.main === module) {
  main();
}
