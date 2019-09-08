import Module from "module";

import { patch } from "./modify-convert-argv";

const $_compile = Module.prototype._compile;

Module.prototype._compile = function (content: string, filename: string) {
  if (filename.endsWith("/webpack-cli/bin/utils/convert-argv.js")) {
    content = patch(content);
    Module.prototype._compile = $_compile;
  }

  $_compile.call(this, content, filename);
};
