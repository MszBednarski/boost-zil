#!/usr/bin/env node
import { createBoostZilFile } from "./shared";

async function main() {
  await createBoostZilFile();
}

if (require.main === module) {
  main();
}
