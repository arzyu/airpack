#!/usr/bin/env node

import fs, { accessSync } from "fs";
import { resolve } from "path";
import child_process from "child_process";

import program from "commander";
import { getPackageBin } from "get-package-bin";
import { getJson } from "@arzyu/get-json";

program
  .version(getJson(resolve(__dirname, "../package.json")).version)
  .option("-s, --server", "run webpack-dev-server instead of webpack-cli")
  .option("--print", "print webpack configuration")
  .allowUnknownOption(true)
  .parse(process.argv);

const pkg = program.server ? "webpack-dev-server" : "webpack-cli";
const pkgPath = resolve(process.cwd(), "./node_modules", pkg);

try {
  accessSync(resolve(pkgPath, "package.json"), fs.constants.R_OK);
} catch (error) {
  if (error.code === "ENOENT") {
    const dependencies = {
      "webpack-cli": ["webpack", "webpack-cli"],
      "webpack-dev-server": ["webpack", "webpack-cli", "webpack-dev-server"]
    };
    const installCommand = `npm add ${dependencies[pkg].join(" ")} --no-save --no-save-dev`;

    console.warn(installCommand);
    child_process.execSync(installCommand, { stdio: "inherit" });

  } else {
    throw error;
  }
}

const debugFlag = process.env.DEBUG === "true" ? "--inspect-brk" : "";
const hook = program.server ? "./hook" : "./hook-webpack-cli";
const binFile = getPackageBin(pkgPath, pkg);

if (!binFile) throw new Error(`${pkg} Not Found!`)

const cmd = `node ${debugFlag} -r ${require.resolve(hook)} ${binFile}`;

child_process.spawn(
  cmd,
  program.args,
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
