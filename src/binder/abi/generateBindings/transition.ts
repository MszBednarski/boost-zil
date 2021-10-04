import { Transition } from "./interfaces";
import { getParamAST, getParam } from "./shared";
import { hasAccept, Labeled, lexer } from "./zil-accept";
import { getZilDocHeader, zilDoc } from "./zil-doc";
import { getABI } from "./getters";

function getZilFlow(acceptsZil: boolean) {
  if (acceptsZil) {
    return {
      zilAmountParam: "amount: T.Uint128,",
      zilAmountVal: "amount.value",
    };
  }
  return { zilAmountParam: "", zilAmountVal: `new BN(0)` };
}

function buildTransition(
  trans: Transition,
  lexed: Labeled[],
  makeSigners: boolean
) {
  const acceptsZil = hasAccept(trans, lexed);
  const documentation = zilDoc(trans, lexed);
  const { zilAmountParam, zilAmountVal } = getZilFlow(acceptsZil);
  const { paramAST: ast, statementsToAdd } = getParamAST(
    trans.params,
    getABI(),
    "a"
  );

  const signers = makeSigners
    ? `/**
 * returns a signer that given an account will sign transition params in such manner:
 * ...params, nonce, transition name, contract address
 * */
sign_${trans.vname}: signer("${trans.vname}"),`
    : "";

  const sig = ast.map((i) => `${i.varName}: ${i.typescriptType}`).join(",\n");
  const param = `[
    ${ast.map((i) => getParam(i.type, i.vname, i.varValue)).join(",\n")}
    ]`;
  return {
    transition: `
${signers}
${trans.vname}: (${zilAmountParam} ${sig})=> {
${statementsToAdd.join("\n")}
  const transactionData = {
    isDeploy: false,
    ...sig,
    contractAddress: a.toSend(),
    contractTransitionName: \`${trans.vname}\`,
    data: ${param},
    amount: ${zilAmountVal}.toString()
  }; 
  return {
/**
 * get data needed to perform this transaction
 * */
toJSON: () => transactionData,
/**
 * send the transaction to the blockchain
 * */
send: async () => dangerousFromJSONCall(txLink)(resolvers)(transactionData, gasLimit), 
  }
},
`,
    documentation,
  };
}

export function buildTransitions(code: string, makeSigners: boolean) {
  const lexed = lexer(code);
  const transitions = getABI()
    .contract_info.transitions //filter out callbacks
    .filter((t) => !t.vname.includes("CallBack"))
    .filter((t) => !t.vname.includes("RecipientAcceptTransfer"))
    .filter((t) => !t.vname.includes("RecipientAcceptTransferFrom"));
  const processed = transitions.map((t) =>
    buildTransition(t, lexed, makeSigners)
  );
  const built = processed.map((p) => p.transition).join("\n");
  const documentation =
    getZilDocHeader(getABI().contract_info.vname) +
    processed.map((p) => p.documentation).join("\n\n");
  return {
    documentation,
    built,
  };
}
