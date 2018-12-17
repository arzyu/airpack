#!/usr/bin/env node

import fs from "fs";
import { resolve, extname } from "path";
import { spawnSync } from "child_process";

import program from "commander-with-unknown-option-patched";
import { extensions, Extension } from "interpret";
import { Configuration } from "webpack";

import { getPackageInfo } from "./utils";
import autoWebpack from ".";

program
  .version(getPackageInfo(resolve(__dirname, "..")).version)
  .option("-c, --config <webpack config file>", "append local webpack config file",
      (file, result) => [...result, file], [])
  .option("-r, --config-register <module>", "preload one or more modules before loading the webpack configuration",
      (moduleName, result) => [...result, moduleName], [])
  .allowUnknownOption()
  .parse(process.argv);

const options: Configuration[] = [];

const defaultConfigExtensions = Object.keys(extensions).sort(
  (a, b) => a === ".js" ? -1 : b === ".js" ? 1 : a.length - b.length
);

const defaultConfigFiles = ["webpack.config", "webpackfile"]
  .map(filename => defaultConfigExtensions.map(ext => resolve(`${filename}${ext}`)))
  .reduce((result, files) => [...result, ...files], [])

const configFiles: string[] = [];

if (program.config.length) {
  configFiles.push(...program.config.map((file: string) => resolve(file)));
} else {
  const defaultConfigFile = defaultConfigFiles
    .find(webpackConfig => fs.existsSync(webpackConfig));

  if (defaultConfigFile) {
    configFiles.push(defaultConfigFile);
  }
}

if (!configFiles.length) {
  options.push({});
} else {
  const getConfigFileExtension = (file: string) =>
    [...defaultConfigExtensions].reverse().find(ext => file.endsWith(ext)) || extname(file);

  const requireConfig = (file: string): Configuration => {
    const configRegister = program.configRegister as string[];

    if (configRegister.length) {
      module.paths.unshift(resolve(process.cwd(), "node_modules"), process.cwd());
      configRegister.forEach(dep => require(dep));
    }

    return require(file).default;
  };

  const registerCompiler = (moduleDescriptor: Extension | null) => {
    if (!moduleDescriptor) {
      return;
    }

    if (typeof moduleDescriptor === "string") {
      require(moduleDescriptor);
    } else
    if (!Array.isArray(moduleDescriptor)) {
      moduleDescriptor.register(require(moduleDescriptor.module));
    } else {
      for (let i = 0; i < moduleDescriptor.length; i++) {
        try {
          registerCompiler(moduleDescriptor[i]);
          break;
        } catch (e) {}
      }
    }
  };

  configFiles.forEach(webpackConfig => {
    registerCompiler(extensions[getConfigFileExtension(webpackConfig)]);
    options.push(autoWebpack(requireConfig(webpackConfig)));
  });
}

spawnSync(
  "webpack",
  ["-c", "/dev/stdin", ...program.args, ...program.unknownOptions],
  {
    input: JSON.stringify(options),
    stdio: [process.stdin, process.stdout, process.stderr]
  }
);
