import Module from "module";

const $require = Module.prototype.require;

Module.prototype.require = function (id: string) {
  const result = $require.call(this, id);
  const filename = Module._resolveFilename(id, this);

  // v8-compile-cache required by webpack-cli changed _compile,
  // therefore we must hook _compile after require("v8-compile-cache")
  if (filename.endsWith("/v8-compile-cache/v8-compile-cache.js")) {
    require("./hook");
    Module.prototype.require = $require;
  }

  return result;
};
