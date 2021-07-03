import { existsSync } from "fs";
import { resolve } from "path";

import interpret from "interpret";
import { getJson } from "@arzyu/get-json";

export const getDepConfigs = () => {
  const cwd = process.cwd();
  const packageInfo = getJson(`${cwd}/package.json`);
  const deps = [
    ...Object.keys(packageInfo.dependencies || {}),
    ...Object.keys(packageInfo.devDependencies || {})
  ];

  const pattern = /^(@.+\/)?webpack-config-.+/;

  return (
    deps
      .filter(dep => pattern.test(dep))
      .map(dep => require.resolve(dep, { paths: [cwd] }))
  );
};

export const getLocalConfig = () => (
  [
    'webpack.config',
    '.webpack/webpack.config',
    '.webpack/webpackfile'
  ]
    .map(filename =>
      [...Object.keys(interpret.extensions), '.cjs'].map(ext => resolve(`${filename}${ext}`))
    )
    .reduce((list, current) => list.concat(current), [])
    .find(file => existsSync(file))
);
