#!/usr/bin/env node

import { resolve } from "path";
import child_process from "child_process";

import program from "commander-with-unknown-option-patched";
import { getJson } from "@arzyu/get-json";

program
  .version(getJson(resolve(__dirname, "../package.json")).version)
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
