import { resolve } from "path";

import { Configuration } from "webpack";
import merge from "webpack-merge";
import { getPackageInfo } from "get-package-info";

const getConfigs = () => {
  const configs: Configuration[] = [];
  const cwd = resolve(process.cwd());
  const packageInfo = getPackageInfo(cwd);
  const deps = [
    ...Object.keys(packageInfo.dependencies || {}),
    ...Object.keys(packageInfo.devDependencies || {})
  ];

  deps.forEach(dep => {
    const pattern = /^(@.+\/)?auto-webpack-.+/;

    if (pattern.test(dep)) {
      const depPath = require.resolve(dep, { paths: [cwd] });
      configs.push(require(depPath).default);
    }
  });

  return configs;
};

const autoWebpack = (config: Configuration) => merge(...getConfigs(), config);

export default autoWebpack;
