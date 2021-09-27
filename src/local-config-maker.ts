import { writeFileSync, readFileSync, existsSync } from "fs";

function mergeDeep(target: any, source: any) {
  if (typeof source == "object") {
    for (const key in source) {
      if (typeof source[key] == "object") {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
}

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> | undefined };

export const jsonConfigMaker = <T>(pathToConfig: string) => {
  if (!existsSync(pathToConfig)) {
    console.warn("Created new config file, since none was found");
    writeFileSync(pathToConfig, JSON.stringify({}));
  }
  const getConfigBase = () => JSON.parse(readFileSync(pathToConfig, "utf-8"));
  let temp = getConfigBase();
  function getConfig(mock?: boolean): T {
    if (mock) {
      return temp;
    }
    return getConfigBase();
  }
  /**
   * @param mock don't update the file, but update the local state
   */
  return (mock?: boolean) => ({
    updateConfig: (toMerge: DeepPartial<T>) => {
      const config = getConfig(mock);
      mergeDeep(config, toMerge);
      if (!mock) {
        writeFileSync(pathToConfig, JSON.stringify(config, null, 2));
      } else {
        temp = config;
      }
    },
    getConfig: () => getConfig(mock),
  });
};
