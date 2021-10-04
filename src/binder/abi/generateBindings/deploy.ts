import { ParamAST } from "./interfaces";
import { getParam } from "./shared";
import { getInitParamAST, getABI } from "./getters";

export function buildDeploy(code: string, sourceCodeHash: string) {
  const init: ParamAST[] = getInitParamAST().paramAST;

  const sig = init.map((i) => `${i.varName}: ${i.typescriptType}`).join(",\n");
  const initParams = init
    .map((i) => getParam(i.type, i.vname, i.varValue))
    .join(",\n");

  const initParam = `[
${getParam(
  "Uint32",
  "_scilla_version",
  `"${getABI().contract_info.scilla_major_version}"`
)},
${initParams}
]`;

  return `deploy: (gasLimit: Long, ${sig}) => {
;
const transactionData = {
  isDeploy: true,
  ...sig,
  data: ${initParam},
}
return {
  /**
   * get data needed to perform this transaction
   * */
  toJSON: () => transactionData,
  /**
   * send the transaction to the blockchain
   * */
  send: async () => dangerousFromJSONDeploy(txLink)(resolvers)(transactionData, gasLimit), 
    }
}`;
}
