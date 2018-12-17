import { resolve } from "path";

import { Configuration } from "webpack";
import merge from "webpack-merge";

import { getPackageInfo } from "./utils";

const getConfigs = () => {
  const configs: Configuration[] = [];
  const packageInfo = getPackageInfo(resolve(process.cwd()));
  const deps = [
    ...Object.keys(packageInfo.dependencies || {}),
    ...Object.keys(packageInfo.devDependencies || {})
  ];

  deps.forEach(dep => {
    const pattern = /^(@.+\/)?auto-webpack-.+/;

    if (pattern.test(dep)) {
      configs.push(require(dep).default);
    }
  });

  return configs;
};

const autoWebpack = (config: Configuration) => merge(...getConfigs(), config);

export default autoWebpack;
