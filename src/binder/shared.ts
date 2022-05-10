export const RED = "\x1B[31m%s\x1b[0m";
export const CYAN = "\x1B[36m%s\x1b[0m";
export const GREEN = "\x1B[32m%s\x1b[0m";
export const MAGENTA = "\x1B[35m%s\x1b[0m";

export async function getPkgJsonDir() {
  return process.cwd();
}
