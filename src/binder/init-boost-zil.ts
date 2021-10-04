#!/usr/bin/env node
import { resolve } from "path";
import { existsSync, writeFileSync } from "fs";
import { getPkgJsonDir } from "./shared";
import { GREEN } from "./shared";

async function main() {
  const rootDir = await getPkgJsonDir();
  const boostZilPath = resolve(rootDir, "./boost-zil.json");
  if (!existsSync(boostZilPath)) {
    writeFileSync(
      boostZilPath,
      `{
  "contracts": [],
  "makeSigners": false
}`
    );
    console.log(GREEN, `🔥 created boost-zil.json at ${boostZilPath}`);
  } else {
    console.log(`boost-zil.json already exists.`);
  }
}

if (require.main === module) {
  main();
}
