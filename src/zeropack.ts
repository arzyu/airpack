#!/usr/bin/env node

import { resolve } from "path";
import child_process from "child_process";

import program from "commander-with-unknown-option-patched";
import { getJson } from "@arzyu/get-json";

const getVersions = () => {
  const v1 = getJson(resolve(__dirname, "../package.json")).version;
  const v2 = getJson(require.resolve("webpack-cli/package.json")).version;
  const v3 = getJson(require.resolve("webpack-dev-server/package.json")).version;

  return [
    ` * zeropack: ${v1}`,
    ` * webpack-cli: ${v2}`,
    ` * webpack-dev-server: ${v3}`
  ].join("\n");
};

program
  .version(getVersions())
  .option("-s, --server", "run webpack-dev-server instead of webpack-cli")
  .option("--print", "print webpack configuration")
  .allowUnknownOption(true)
  .parse(process.argv);

const debugFlag = process.env.DEBUG === "true" ? "--inspect-brk" : "";
const hook = program.server ? "./hook" : "./hook-webpack-cli";
const pkg = program.server ? "webpack-dev-server/bin/webpack-dev-server" : "webpack-cli";

child_process.spawn(
  `node ${debugFlag} -r ${require.resolve(hook)} ${require.resolve(pkg)}`,
  program.unknownOptions,
  {
    env: {
      ...process.env,
      ZEROPACK: require.resolve(".."),
      ZEROPACK_PRINT: program.print ? "true" : "false"
    },
    stdio: "inherit",
    shell: true
  }
);

/* -*- ts -*- */
