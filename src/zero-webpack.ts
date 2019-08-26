#!/usr/bin/env node

import fs from "fs";
import { resolve, extname } from "path";

import program from "commander";
import { extensions, Extension } from "interpret";
import webpack, { Configuration } from "webpack";
import { stdout as colors } from "supports-color";
import { getPackageInfo } from "get-package-info";

import zeroWebpack from ".";

const WebpackDevServer = require("webpack-dev-server");

program
  .version(getPackageInfo(resolve(__dirname, "..")).version)
  .option("-c, --config <webpack config file>", "append local webpack config file",
      (file, result) => [...result, file], [])
  .option("-r, --config-register <module>", "preload one or more modules before loading the webpack configuration",
      (moduleName, result) => [...result, moduleName], [])
  .option("-w, --watch", "webpack watch")
  .option("--dev-server", "use webpack-dev-server")
  .option("--debug", "show zero-webpack debug info")
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
    options.push(requireConfig(webpackConfig));
  });
}

const compilerOptions = options.map(option => zeroWebpack(option));

if (program.debug) {
  require("util").inspect.defaultOptions.depth = null;
  console.log(compilerOptions);
}

const compiler = webpack(compilerOptions);
const devServerOptions = compilerOptions[0].devServer || {};

if (program.devServer) {
  const port = process.env.PORT || devServerOptions.port || 3000;
  const host = devServerOptions.host = process.env.HOST || devServerOptions.host || "localhost";

  devServerOptions.publicPath = devServerOptions.publicPath || "/";

  new WebpackDevServer(compiler, devServerOptions).listen(port, host);
} else {
  let lastHash: string | null = null;

  const compilerCallback: webpack.ICompiler.Handler = (err, stats) => {
    if (err) {
      lastHash = null;
      console.error(err.stack || err);
      process.exit(1);
    }

    if (stats.hash !== lastHash) {
      lastHash = stats.hash as string;

      if (stats.compilation && stats.compilation.errors.length !== 0) {
        const errors = stats.compilation.errors;
        if (errors[0].name === "EntryModuleNotFoundError") {
          console.error("\n\u001b[1m\u001b[31mInsufficient number of arguments or no entry found.");
        }
      }

      const statsString = stats.toString({ colors });

      if (statsString) {
        process.stdout.write(`${statsString}\n`);
      }
    }
  };

  if (program.watch) {
    compiler.watch({}, compilerCallback);
  } else {
    compiler.run(compilerCallback);
  }
}

/* -*- ts -*- */
