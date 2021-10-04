export interface Transition {
  vname: string;
  params: { vname: string; type: string }[];
}

export interface ABI {
  contract_info: {
    scilla_major_version: string;
    vname: string;
    params: { vname: string; type: string }[];
    fields: { vname: string; type: string; depth: number }[];
    transitions: Transition[];
    procedures: { vname: string }[];
    events: [];
    ADTs: {
      tname: string;
      tparams: string[];
      tmap: { cname: string; argtypes: string[] }[];
    }[];
  };
  warnings: [];
  gas_remaining: string;
}

export interface ParamAST {
  type: string;
  vname: string;
  varName: string;
  varValue: string;
  typescriptType: string;
}
