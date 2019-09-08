import { resolve } from "path";

import { Configuration } from "webpack";
import { getPackageInfo } from "get-package-info";

export const getConfigs = () => {
  const configs: Configuration[] = [];
  const cwd = resolve(process.cwd());
  const packageInfo = getPackageInfo(cwd);
  const deps = [
    ...Object.keys(packageInfo.dependencies || {}),
    ...Object.keys(packageInfo.devDependencies || {})
  ];

  deps.forEach(dep => {
    const pattern = /^(@.+\/)?zero-webpack-.+/;

    if (pattern.test(dep)) {
      const depPath = require.resolve(dep, { paths: [cwd] });
      configs.push(require(depPath).default);
    }
  });

  return configs;
};
