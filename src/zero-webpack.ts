#!/usr/bin/env node

import { resolve, dirname } from "path";
import child_process from "child_process";

import program from "commander";
import { getPackageInfo } from "get-package-info";

const getVersions = () => {
  const v1 = getPackageInfo(resolve(__dirname, "..")).version;
  const v2 = getPackageInfo(dirname(require.resolve("webpack-cli/package.json"))).version;
  const v3 = getPackageInfo(dirname(require.resolve("webpack-dev-server/package.json"))).version;

  return [
    ` * zero-webpack: ${v1}`,
    ` * webpack-cli: ${v2}`,
    ` * webpack-dev-server: ${v3}`
  ].join("\n");
};

program
  .version(getVersions())
  .option("--dev-server", "run webpack-dev-server ...")
  .allowUnknownOption(true)
  .parse(process.argv);

const debugFlag = process.env.DEBUG === "true" ? "--inspect-brk" : "";
const pkg = program.devServer ? "webpack-dev-server/bin/webpack-dev-server" : "webpack-cli";

child_process.spawn(
  `node ${debugFlag} -r ${require.resolve("./hook")} ${require.resolve(pkg)}`,
  program.rawArgs.slice(2),
  {
    env: {
      ...process.env,
      ZERO_WEBPACK: require.resolve("..")
    },
    stdio: "inherit",
    shell: true
  }
);

/* -*- ts -*- */
