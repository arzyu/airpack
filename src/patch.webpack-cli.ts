import { parse } from "@babel/parser";
import traverse, { NodePath, TraverseOptions } from "@babel/traverse";
import * as t from "@babel/types";
import template from "@babel/template";
import generate from "@babel/generator";

const Visitor: TraverseOptions = {
  enter(p) {
    if (
      p.isClassDeclaration() &&
      p.get("id").isIdentifier({ name: "WebpackCLI" })
    ) {
      const pMethods = p.get("body.body") as NodePath<t.ClassMethod>[];
      const pMethodResolveConfig = pMethods.find(m => t.isIdentifier(m.node.key, { name: "resolveConfig" }))!;
      const pIfCheckConfigName = pMethodResolveConfig.get("body.body.4") as NodePath<t.IfStatement>;

      const astAirpackMerge = template.ast(`
        Object.assign(config, require(process.env.AIRPACK).airpackMerge(config));
      `);

      // insert airpack merge before `if (options.configName) {...}`
      pIfCheckConfigName.insertBefore(astAirpackMerge);

      const astPrint = template.ast(`
        if (process.env.AIRPACK_PRINT === "true") {
          const { options, path } = config;
          const print = (obj) => console.dir(obj, { depth: null, color: true });

          console.log("[airpack] final webpack config:")
          print(options);
          console.log("");
          console.log("[airpack] effective webpack configuration paths:")
          print(Array.isArray(options) ? options.map(opts => path.get(opts)) : path.get(options));

          process.exit();
        }
      `) as t.IfStatement;

      // remove `if (options.merge) {...}`, and insert airpack print
      pIfCheckConfigName.getNextSibling().replaceWith(astPrint);

      p.stop();
    }
  }
};

export const patch = (code: string) => {
  const ast = parse(code);

  traverse(ast, Visitor);

  const { code: newCode } = generate(ast, { comments: false });

  return newCode;
};
