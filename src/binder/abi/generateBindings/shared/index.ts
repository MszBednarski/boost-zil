import { Value } from "@zilliqa-js/contract";
import { ABI } from "../interfaces";
import { getTypescriptType } from "./getTypescriptType";

export function removeComments(code: string) {
  let start = -1;
  for (let i = 0; i < code.length - 1; i++) {
    const chars = code[i] + code[i + 1];
    if (chars == "(*") {
      start = i;
    }
    if (chars == "*)") {
      // const toRemove = code.substring(start, i+2)
      // console.log(toRemove)
      code = code.slice(0, start) + code.slice(i + 2, code.length);
      //start from the begining
      i = 0;
    }
  }
  return code;
}

const getVarValue = (t: string, varRef: string, typescriptType: string) => {
  if (typescriptType.startsWith("T.")) {
    return `${varRef}.toSend()`;
  }
  if (
    t.startsWith("BNum") ||
    t.startsWith("String") ||
    t.startsWith("ByStr") ||
    t.startsWith("Uint32") ||
    t.startsWith("Uint128") ||
    t.startsWith("Uint256")
  ) {
    return `${varRef}.toSend()`;
  }
  if (t.startsWith("Uint")) {
    return `${varRef}.toString()`;
  }
  return varRef;
};

const getScillaSendType = (
  t: string,
  contractName: string,
  contractAddressVarName: string
) => {
  //if is a custom adt replace all contractName. -> ${contractADdressVarName}.
  // . is important as it prevents replacing substrings of some definition
  if (t.includes(contractName) && !t.startsWith("ByStr20")) {
    if (contractAddressVarName.length == 0) {
      throw new Error(
        "Couldn't bind as there are custom user ADTs in init parameters"
      );
    }
    return t.replace(
      `${contractName}.`,
      `\${(${contractAddressVarName}.toSend().toLowerCase())}.`
    );
  }
  // scilla-checker returns the Bystr20 with contract field type as type but
  // this is not what deployment allows in the init params
  if (t.startsWith("ByStr20")) {
    return "ByStr20";
  }
  // ex:  type: `List (ByStr20 with contract field balances : Map (ByStr20) (Uint128) end)`
  // scilla stop griefing
  if (t.startsWith("List (ByStr20 with contract field")) {
    return "List (ByStr20)";
  }
  return t;
};

export const getParamAST = (
  a: { vname: string; type: string }[],
  abi: ABI,
  contractAddressVarName: string
) => {
  const contractName = abi.contract_info.vname;
  let statementsToAdd: string[] = [];
  const paramAST = a.map((i) => {
    const varName = `__${i.vname}`;
    const typescriptType = getTypescriptType(
      i.type,
      contractName,
      contractAddressVarName,
      abi,
      varName
    );
    statementsToAdd = statementsToAdd.concat(...typescriptType.statementsToAdd);
    return {
      ...i,
      varName,
      typescriptType: typescriptType.typescriptType,
      varValue: getVarValue(i.type, varName, typescriptType.typescriptType),
      type: getScillaSendType(i.type, contractName, contractAddressVarName),
    };
  });
  return {
    statementsToAdd,
    paramAST,
  };
};

export const getParam = (
  type: string,
  vname: string,
  value: Value["value"]
) => `{
    type: \`${type}\`,
    vname: \`${vname}\`,
    value: ${value},
}`;
