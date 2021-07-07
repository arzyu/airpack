import Module from "module";

import chalk from "chalk";

import { getMatchedFiles } from "./specs";
import { patch } from "./patch.webpack-cli";

const wpc = process.env.AIRPACK_WPC!;
const wpcVersion = process.env.AIRPACK_WPC_VERSION!;
const hookFiles = getMatchedFiles(wpcVersion);

if (!hookFiles || !hookFiles.length) {
  console.error(chalk`[airpack]: {red No files defined for hooking into, ${wpc}@${wpcVersion}}`);
  process.exit()
}

const hookStates = hookFiles.map(() => false);

const hookCompile = () => {
  const $_compile = Module.prototype._compile;

  Module.prototype._compile = function (content: string, filename: string) {
    const i = hookFiles.findIndex(file => filename.endsWith(`/${wpc}/${file}`));

    if (i !== -1) {
      const hookFile = hookFiles[i];

      content = patch(content, hookFile);
      hookStates[i] = true;

      if (hookStates.every(state => state)) {
        Module.prototype._compile = $_compile;
      }
    }

    $_compile.call(this, content, filename);
  };
};

const $require = Module.prototype.require;

Module.prototype.require = function (id: string) {
  const result = $require.call(this, id);
  const filename = Module._resolveFilename(id, this);

  // v8-compile-cache required by webpack-cli changed _compile,
  // therefore we must hook _compile after require("v8-compile-cache")
  if (filename.endsWith("/v8-compile-cache/v8-compile-cache.js")) {
    hookCompile();
    Module.prototype.require = $require;
  }

  return result;
};
