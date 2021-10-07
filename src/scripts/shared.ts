import { getPkgJsonDir, GREEN, MAGENTA } from "../binder/shared";
import { resolve } from "path";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { exec } from "child_process";

export async function createFile(
  payload: string,
  relPath: string,
  isAbsolutePath?: true
) {
  const rootDir = await getPkgJsonDir();
  const filePath = isAbsolutePath ? relPath : resolve(rootDir, relPath);
  const name = filePath.split("/").shift() as string;
  if (!existsSync(filePath)) {
    writeFileSync(filePath, payload);
    console.log(GREEN, `📖 created ${name} at ${filePath}`);
  } else {
    console.log(`${name} already exists.`);
  }
}

export async function createBoostZilFile(...contracts: string[]) {
  console.log("🚀 creating boost-zil.json");
  await createFile(
    JSON.stringify(
      {
        contracts,
        makeSigners: false,
      },
      null,
      2
    ),
    resolve(process.cwd(), "./boost-zil.json"),
    true
  );
}

export async function createGitignore() {
  console.log("✨ creating .gitignore");
  await createFile(
    `node_modules
.env`,
    resolve(process.cwd(), "./.gitignore"),
    true
  );
}

export async function promisifiedExec(toExec: string) {
  return await new Promise<string>((resolve, reject) => {
    exec(toExec, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      if (stderr != "" && typeof stderr != "undefined") {
        console.log(MAGENTA, stderr);
      }
      resolve(stdout);
    });
  });
}

export async function tscInit() {
  console.log("👨‍💻 initializing typescript");
  await promisifiedExec("npx tsc --init");
}

export async function installBoostZil() {
  console.log("🔥 installing boost-zil");
  await promisifiedExec("npm i --save boost-zil");
}

export async function installDevDependencies() {
  console.log("🛠️  installing dev dependencies");
  await promisifiedExec(
    "npm i -D @types/big.js @types/bn.js @types/chai @types/create-hash @types/long @types/mocha @types/node chai mocha ts-node tslib typescript"
  );
}

export async function createSrc() {
  const src = "./src/SmartContract";
  mkdirSync(resolve(process.cwd(), src), { recursive: true });
  return src;
}

export async function createPackage() {
  console.log("📦 creating package.json");
  await createFile(
    JSON.stringify(
      {
        scripts: {
          build: "boost-zil-build",
          test: "npm run build && mocha -r ts-node/register 'test/**/*test.ts' --timeout 1000000",
        },
        dependencies: {},
        devDependencies: {},
      },
      null,
      2
    ),
    resolve(process.cwd(), "./package.json"),
    true
  );
}
