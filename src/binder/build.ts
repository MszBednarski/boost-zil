import { generateBindings, getABI } from "./abi";
import { resolve, dirname, basename } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { format } from "prettier";

function createDirIfNotExists(dir: string) {
  !existsSync(dir) && mkdirSync(dir, { recursive: true });
}

export async function buildBind(
  contractPath: string,
  options: {
    makeSigners: boolean;
    "custom-boost-zil-path": string;
  }
) {
  try {
    const scillaContract = contractPath;
    const contractFileName = basename(contractPath);
    const contractDir = dirname(scillaContract);
    const codePath = resolve(contractDir, scillaContract);
    const abiPath = resolve(contractDir, "./build/abi.json");
    const bindPath = resolve(contractDir, "./build/bind.ts");
    const buildDirectory = resolve(contractDir, "./build/");
    const documentationPath = resolve(contractDir, "./README.md");
    createDirIfNotExists(buildDirectory);
    const code = readFileSync(codePath, "utf-8");
    const abi = await getABI(code);
    const contractName = abi.contract_info.vname;
    if (contractName != contractFileName.replace(".scilla", "")) {
      throw new Error(
        `.scilla contract file must have the same name! Change it to: ${abi.contract_info.vname}.scilla`
      );
    }
    const uuidRegex =
      /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}./g;
    //replace for adts
    const stringified = JSON.stringify(abi, null, 2).replace(
      uuidRegex,
      `${contractName}.`
    );
    writeFileSync(abiPath, stringified);
    const { sdkCode, documentation } = generateBindings(
      stringified,
      code,
      options
    );
    let bindings = sdkCode;
    try {
      bindings = format(sdkCode, {
        parser: "babel-ts",
        insertPragma: true,
      });
    } catch (e) {
      console.warn(
        `Failed to format code, it means that there is a type error, inspect the output!`
      );
    }
    writeFileSync(bindPath, bindings);
    writeFileSync(documentationPath, documentation);
  } catch (e) {
    console.error(e);
  }
}
