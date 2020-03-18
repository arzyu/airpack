import { Configuration } from "webpack";
import { getJson } from "@arzyu/get-json";

export const getConfigs = () => {
  const configs: Configuration[] = [];
  const cwd = process.cwd();
  const packageInfo = getJson(`${cwd}/package.json`);
  const deps = [
    ...Object.keys(packageInfo.dependencies || {}),
    ...Object.keys(packageInfo.devDependencies || {})
  ];

  deps.forEach(dep => {
    const pattern = /^(@.+\/)?airpack-.+/;

    if (pattern.test(dep)) {
      const depPath = require.resolve(dep, { paths: [cwd] });
      configs.push(require(depPath).default);
    }
  });

  return configs;
};
