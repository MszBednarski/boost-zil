#!/usr/bin/env node
import {
  createBoostZilFile,
  createPackage,
  installBoostZil,
  installDevDependencies,
  createGitignore,
  tscInit,
  createSrc,
  createFile,
  createTest,
} from "./shared";
import { RED } from "../binder/shared";
import { resolve } from "path";
import slotMachine from "./slotMachineScilla";
import testSlotMachine from "./testSlotMachine";

async function main() {
  try {
    await createPackage();
    await createGitignore();
    await installDevDependencies();
    const src = await createSrc();
    const scillaFile = src + "/SmartContract.scilla";
    await createFile(slotMachine, resolve(process.cwd(), scillaFile), true);
    const testSrc = await createTest();
    const testFile = testSrc + "/smart-contract.test.ts";
    await createFile(testSlotMachine, resolve(process.cwd(), testFile), true);
    await createBoostZilFile(scillaFile);
    await installBoostZil();
    await tscInit();
  } catch (e) {
    console.error(RED, e);
  }
}

if (require.main === module) {
  main();
}
