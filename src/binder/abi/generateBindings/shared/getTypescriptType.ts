import { ABI } from "../interfaces";
import { customLex, Labeled } from "../zil-accept";

function getCustomADT(name: string, abi: ABI) {
  const found = abi.contract_info.ADTs.find((a) => a.tname == name);
  if (!found) {
    throw new Error(`Couldn't find custom user ADT ${name}`);
  }
  return found;
}

export const getTypescriptType = (
  scillaType: string,
  contractName: string,
  contractAddressVarName: string,
  abi: ABI,
  varname: string
) => {
  const statementsToAdd: string[] = [];
  function translateScillaTypeToTypescriptType(lexed: Labeled[]): string {
    if (lexed.length == 0) {
      return "";
    }
    const t = lexed[0].w;
    if (t.startsWith(contractName)) {
      statementsToAdd.push(
        `${varname}.setContractAddress(${contractAddressVarName});`
      );
      const adtName = t.replace(`${contractName}.`, "");
      statementsToAdd.push(`${varname}.setADTname("${adtName}");`);
      const res = parseCustomADT(lexed);
      return res;
    }
    if (t.startsWith("(") || t.startsWith(")")) {
      lexed.shift();
      return translateScillaTypeToTypescriptType(lexed);
    }
    if (t.startsWith("List")) {
      const res = parseList(lexed);
      return res;
    }
    if (t.startsWith("Pair")) {
      const res = parsePair(lexed);
      return res;
    }
    if (t.startsWith("Uint128")) {
      return "T.Uint128";
    }
    if (t.startsWith("Uint32")) {
      return "T.Uint32";
    }
    if (t.startsWith("Uint256")) {
      return "T.Uint256";
    }
    if (t.startsWith("ByStr20")) {
      return "T.ByStr20";
    }
    if (t.startsWith("ByStr33")) {
      return "T.ByStr33";
    }
    if (t.startsWith("ByStr64")) {
      return "T.ByStr64";
    }
    if (t.startsWith("ByStr")) {
      return "T.ByStr";
    }
    if (t.startsWith("String")) {
      return "T.ScillaString";
    }
    if (t.startsWith("BNum")) {
      return "T.BNum";
    }
    if (t.startsWith("Uint")) {
      return "BN";
    }
    return `Value["value"] | {
            constructor: string;
            argtypes: string[];
            arguments: Value[] | string[];
        }[] | string[]`;
  }
  function parseList(list: Labeled[]): string {
    if (list.length == 0) {
      return "";
    }
    const first = list.shift() as Labeled;
    if (first.w == "List") {
      return `T.List<${translateScillaTypeToTypescriptType(list)}>`;
    } else {
      return translateScillaTypeToTypescriptType(list);
    }
  }
  function parsePair(list: Labeled[]): string {
    if (list.length == 0) {
      return "";
    }
    const first = list.shift() as Labeled;
    if (first.w == "Pair") {
      const fst = list;
      const snd = list.slice(4);
      return `T.Pair<${translateScillaTypeToTypescriptType(
        fst
      )},${translateScillaTypeToTypescriptType(snd)}>`;
    } else {
      return translateScillaTypeToTypescriptType(list);
    }
  }
  function parseCustomADT(list: Labeled[]): string {
    if (list.length == 0) {
      return "";
    }
    const first = list.shift() as Labeled;
    if (first.w.startsWith(`${contractName}.`)) {
      const adt = getCustomADT(first.w, abi);
      const argtypes = adt.tmap[0].argtypes.map((a) =>
        customLex(a, ["(", ")", ",", "{", "}"])
      );
      return `T.CustomADT<[${argtypes
        .map(translateScillaTypeToTypescriptType)
        .join(",")}]>`;
    } else {
      return translateScillaTypeToTypescriptType(list);
    }
  }
  const lexed = customLex(scillaType, ["(", ")", ",", "{", "}"]);
  return {
    typescriptType: translateScillaTypeToTypescriptType(lexed),
    statementsToAdd,
  };
};
