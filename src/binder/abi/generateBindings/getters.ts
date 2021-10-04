import { ABI } from "./interfaces";
import { getParamAST } from "./shared";

var a: ABI;

export const setABI = (ab: ABI) => (a = ab);
export const getABI: () => ABI = () =>
  !a
    ? (() => {
        throw new Error("ABI not set!");
      })()
    : a;

export const getInitParamAST = () =>
  getParamAST(getABI().contract_info.params, getABI(), "");

var imports: { [key: string]: boolean } = {};

export const addImport = (..._import: string[]) =>
  _import.forEach((_imp) => (imports[_imp] = true));
export const getImports = () => Object.entries(imports).map(([k, v]) => k);
