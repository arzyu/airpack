import Module from "module";

import { patch } from "./modify-convert-argv";

const $require = Module.prototype.require;

Module.prototype.require = function (id: string) {
  const result = $require.call(this, id);
  const filename = Module._resolveFilename(id, this);

  // v8-compile-cache required by webpack-cli changed _compile,
  // therefore we must hook _compile after require("v8-compile-cache")
  if (filename.endsWith("/v8-compile-cache/v8-compile-cache.js")) {
    const $_compile = Module.prototype._compile;

    Module.prototype._compile = function (content: string, filename: string) {
      if (filename.endsWith("/webpack-cli/bin/utils/convert-argv.js")) {
        content = patch(content);
        Module.prototype._compile = $_compile;
      }

      $_compile.call(this, content, filename);
    };

    Module.prototype.require = $require;
  }

  return result;
};
