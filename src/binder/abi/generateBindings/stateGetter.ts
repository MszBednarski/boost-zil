import { getInitParamAST, getABI } from "./getters";
import { getParamAST } from "./shared";

export const stateGetter = () => {
  const initStateType = `{${getInitParamAST().paramAST.reduce(
    (prev, cur) => `${prev} ${cur.vname} : any,`,
    ``
  )}}`;
  const params = getABI().contract_info.fields.map((a) => `"${a.vname}"`);
  if (params.length == 0) params.push("string");
  return `
  state: <
  E extends "true" | "false",
  Query extends ContractSubStateQueryCast<
   ${params.join(" | ")} 
  >
>(
  query: Query,
  includeInit: E
) => ({
  get: (...contractAddresses: T.ByStr20[]) =>
    partialState(async () => { return (await getZil()).zil})<
      typeof query,
      typeof includeInit,
      {
        contractAddress: typeof contractAddresses[0];
        includeInit: typeof includeInit;
        query: typeof query;
      },
      ${initStateType}
    >(
      ...contractAddresses.map((c) => ({
        contractAddress: c,
        includeInit,
        query,
      }))
    ),
}),
`;
};
