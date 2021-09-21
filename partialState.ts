import { ByStr20 } from "./signable";
import "isomorphic-fetch";
import { Zilliqa } from "@zilliqa-js/zilliqa";

declare var fetch: any;

interface RPCSubStateQuery {
  query: { params: (string | any[])[] };
  meta: { fields: string[] };
}
interface RPCCall {
  method: string;
  params: (string | any[])[];
  id: string;
  jsonrpc: string;
}
interface RPCResult {
  id: "1";
  jsonrpc: "2.0";
  result: any;
}

function addMeta<T extends {}>(r: T) {
  return { ...r, id: "1", jsonrpc: "2.0" };
}

async function sendBatchRPCMethodCalls(b: RPCCall[], toUrl: string) {
  const response = await fetch(toUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(b.map(addMeta)),
  });
  const text = await response.text();
  const result = JSON.parse(text) as RPCResult[];
  return result;
}

function assignKeys(target: {}, keys: string[], value: any) {
  let tmp: { [key: string]: any } = target;
  let lastKey = keys[keys.length - 1];
  for (let index = 0; index < keys.length - 1; index++) {
    const k = keys[index];
    if (typeof tmp[k] == "undefined") {
      tmp[k] = {};
    }
    tmp = tmp[k];
  }
  tmp[lastKey] = value;
}

function callToValue(call: RPCResult, keys: string[]) {
  const result = call.result;
  if (typeof result == "undefined" || result == null) {
    console.warn(
      "Call result for key trail:",
      keys,
      "is undefined, this might not be defined in the smart contract!"
    );
    return undefined;
  }
  let tmp = result;
  keys.forEach((k) => (tmp = tmp[k]));
  return tmp;
}

function restoreObject(res: RPCResult[], b: PartialQueryToRPCRes) {
  if (b.includeInit == "true") {
    const initResult: { [key: string]: any } = { original: res[0].result };
    // surgically update the init state to something comprehensible
    (
      res[0].result as {
        type: string;
        value: string;
        vname: string;
      }[]
    ).forEach((r) => (initResult[r.vname] = r.value)) as any;
    res[0].result = initResult;
  }
  const resultObject = {};
  for (const index in res) {
    const call = res[index];
    const meta = b.meta[index];
    assignKeys(
      resultObject,
      meta.putFields,
      callToValue(call, meta.responseFields)
    );
  }
  return resultObject;
}

export interface ContractSubStateQuery {
  [key: string]: "*" | ContractSubStateQuery | undefined;
}

export type ContractSubStateQueryCast<Keys extends string> = Partial<
  {
    [Key in Keys]: "*" | ContractSubStateQuery;
  }
>;

interface ContractQuery {
  contractAddress: ByStr20;
  includeInit: "true" | "false";
  query: ContractSubStateQuery;
}

function passQuery(
  q: ContractSubStateQuery,
  fields: string[],
  queries: RPCSubStateQuery[],
  contractAddress: string
): RPCSubStateQuery[] {
  const entries = Object.entries(q);
  if (entries.length == 0) {
    return queries;
  }
  const res: RPCSubStateQuery[] = [];
  for (const [field, starOrFields] of entries) {
    if (!starOrFields) throw new Error("Pass query: starOrFields undefined");
    if (starOrFields == "*") {
      const allFields = fields.concat(field);
      const firstField = allFields.shift();
      if (!firstField) throw new Error("Pass query: firstField undefined");
      res.push({
        query: { params: [contractAddress, firstField, allFields] },
        meta: { fields: [firstField, ...allFields] },
      });
    } else {
      res.push(
        ...passQuery(starOrFields, [...fields, field], [], contractAddress)
      );
    }
  }
  return res;
}

interface PartialQueryToRPCRes {
  includeInit: "true" | "false";
  queries: RPCCall[];
  meta: { responseFields: string[]; putFields: string[] }[];
}

function partialQueryToRPC(partial: ContractQuery): PartialQueryToRPCRes {
  const { includeInit } = partial;
  const init =
    includeInit == "true"
      ? [
          addMeta({
            method: "GetSmartContractInit",
            params: [partial.contractAddress.noPrefixed()],
          }),
        ]
      : [];
  const initMeta =
    includeInit == "true" ? [{ responseFields: [], putFields: ["_init"] }] : [];
  const subStateQueries = passQuery(
    partial.query,
    [],
    [],
    partial.contractAddress.noPrefixed()
  );
  const queries = [
    ...init,
    ...subStateQueries
      .map((r) => r.query)
      .map((r) => addMeta({ ...r, method: "GetSmartContractSubState" })),
  ];
  const meta = [
    ...initMeta,
    ...subStateQueries.map((r) => ({
      responseFields: r.meta.fields,
      putFields: r.meta.fields,
    })),
  ];
  return { queries, meta, includeInit };
}

export const toAddrKey = (s: string) => new ByStr20(s).lowerCase();
export type ReplaceStar<T> = {
  [P in keyof T]: T[P] extends "*"
    ? unknown
    : T[P] extends {}
    ? ReplaceStar<T[P]>
    : T[P];
};

type IsTrue<Condition, Result = {}> = Condition extends "true"
  ? Result & {
      _scilla_version: string;
      _creation_block: string;
      _this_address: string;
    }
  : {};

function cutArray<T>(arr: T[], cuts: number[]) {
  const res: T[][] = [];
  let start = 0;
  for (const cut of cuts) {
    res.push(arr.slice(start, cut + start));
    start += cut;
  }
  return res;
}

export const partialState = (getZil: () => Promise<Zilliqa>) =>
  async function <
    T extends ContractSubStateQuery,
    E extends "true" | "false",
    B extends { includeInit: E; contractAddress: ByStr20; query: T },
    Init extends {}
  >(...partial: B[]) {
    const partialQueryToRpcRes = partial.map((o) => {
      const r = partialQueryToRPC(o);
      return {
        length: r.queries.length,
        toRpc: r,
      };
    });
    const result = await sendBatchRPCMethodCalls(
      partialQueryToRpcRes.map((p) => p.toRpc.queries).flat(),
      (
        await getZil()
             //@ts-expect-error
      ).provider.nodeURL
    );
    const cut = cutArray(
      result,
      partialQueryToRpcRes.map((o) => o.length)
    );
    const restored = cut.map((res, index) => ({
      _this_address: partial[index].contractAddress,
      ...(restoreObject(
        res,
        partialQueryToRpcRes[index].toRpc
      ) as ReplaceStar<T> & { _init: IsTrue<E, Init> }),
    }));
    return restored;
  };
