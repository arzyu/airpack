#!/usr/bin/env node

import child_process from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

import chalk from "chalk";
import { Command, Option } from "commander";
import { getPackageBin } from "get-package-bin";
import { getJson } from "@arzyu/get-json";
import { cmp } from "semver";

import { getDepConfigs, getLocalConfig } from "./get-configs";
import { getMinVersion } from "./specs";

const pkgInfo = getJson(resolve(__dirname, "../package.json"));
const program = new Command(pkgInfo.name);

program
  .usage("[options] [other-webpack-options]")
  .description(pkgInfo.description)
  .option("-s, --server", "Run webpack-dev-server")
  .option<string[]>("-c, --config <file|package...>", "Specify webpack configs", (v, c) => [...c, v], [])
  .option("--no-autoconfig", "Only load webpack configs from '-c, --config ...' option")
  .option("--print", "Print webpack configs with paths, without running webpack")
  .addOption(new Option("--no-patch", "Run webpack without patching, for airpack development").hideHelp())
  .version(pkgInfo.version, "-v, --version", `Print ${pkgInfo.name} version`)
  .helpOption("-h, --help", "Print this help")
  .allowUnknownOption(true)
  .parse(process.argv);

const opts = program.opts();

const wpc = "webpack-cli";
const wpcPath = resolve("node_modules", wpc);
const wpcBin = getPackageBin(wpcPath, wpc);

if (!wpcBin) {
  console.error(chalk`[airpack]: {red Package "${wpc}" not found!}`)
  process.exit();
}

const wpcVersion = getJson(resolve(wpcPath, "package.json")).version;
const minSupportedVersion = getMinVersion();

if (opts.patch && cmp(wpcVersion, "<", minSupportedVersion)) {
  console.error(chalk`[airpack]: {red ${wpc}@${wpcVersion} is NOT supported! expect: (${wpc} >= ${minSupportedVersion})}`);
  process.exit();
}

console.log(chalk`[airpack]: {cyan Use ${wpc}@${wpcVersion}}`)

const runEnv: { [p: string]: any } = {
  AIRPACK: require.resolve("./index"),
  AIRPACK_PRINT: opts.print ? "true" : "false",
  AIRPACK_WPC: wpc,
  AIRPACK_WPC_VERSION: wpcVersion
};

const runArgs: string[] = [];

if (opts.server) {
  const devServerPkg = "webpack-dev-server";
  const devServerPkgPath = resolve("node_modules", devServerPkg, "package.json");

  if (!existsSync(devServerPkgPath)) {
    console.error(chalk`[airpack]: {red Package "${devServerPkg}" not found!}`);
    process.exit();
  }

  runArgs.unshift("serve");
}

const configs = (opts.config as string[]).map((config: string) => {
  const file = resolve(config);
  return existsSync(file) ? file : require.resolve(config, { paths: [process.cwd()] });
});

if (!opts.autoconfig) {
  if (!opts.config.length) {
    console.error(chalk`[airpack]: {red Option "-c, --config <file|package>" is needed when using --no-autoconfig}`);
    process.exit();
  }
} else {
  // config priority: --config > local > dependencies
  configs.unshift(
    ...getDepConfigs(),
    ...[getLocalConfig()].filter($ => !!$) as string[]
  );
}

// remove duplicated configs in place, keep the original priority
configs.splice(0, configs.length, ...[...new Set(configs.reverse())].reverse())

runArgs.push(...configs.map(config => `--config ${config}`));

const runOpts: string[] = [];

if (opts.patch) {
  runOpts.unshift(`--require ${require.resolve("./hook.webpack-cli")}`);
};

const nodeArgv = process.execArgv;
const debugFlag = nodeArgv.find(arg => /^--inspect(-brk)?$/.test(arg));
const tsNodeFlag = nodeArgv.find(
  (arg, i, args) => arg === "ts-node/register" && /^(-r|--require)$/.test(args[i-1])
) ? "--require ts-node/register" : undefined;

if (tsNodeFlag) {
  runEnv["TS_NODE_PROJECT"] = resolve(__dirname, "../tsconfig.json");
  runOpts.unshift(tsNodeFlag);
}

if (debugFlag) {
  runOpts.unshift(debugFlag);
}

const cmd = `node ${runOpts.join(" ")} ${wpcBin} ${runArgs.join(" ")}`;

child_process.spawn(
  cmd,
  program.args,
  {
    env: {
      ...process.env,
      ...runEnv
    },
    stdio: "inherit",
    shell: true
  }
);

/* -*- ts -*- */
