import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import template from "@babel/template";

import { sha1 } from "./sha1";

export type Target = "WebpackCLI.resolveConfig"
  | "module.exports"
  | "handleConfigResolution"
  | "configFileLoaded"
;

export type TargetTest = Record<Target, (p: NodePath) => NodePath[] | void>;

export const targetTest: TargetTest = {
  ["WebpackCLI.resolveConfig"]: (p: NodePath) => {
    if (
      p.isClassDeclaration() &&
      p.get("id").isIdentifier({ name: "WebpackCLI" })
    ) {
      const pMethods = p.get("body.body") as NodePath<t.ClassMethod>[];
      const pMethodResolveConfig = pMethods.find(m => t.isIdentifier(m.node.key, { name: "resolveConfig" }));

      if (pMethodResolveConfig) {
        t.removeComments(pMethodResolveConfig.node);
        return [pMethodResolveConfig];
      }

      return [];
    }
  },
  ["module.exports"]: (p: NodePath) => {
    if (
      p.isProgram()
    ) {
      const pExpressionStatement = p.get("body").find(($, i, items) => i === items.length - 1);

      if (
        pExpressionStatement &&
        pExpressionStatement.isExpressionStatement()
      ) {
        const pMemberExpression = pExpressionStatement.get("expression.left") as NodePath<t.MemberExpression>;

        if (
          pMemberExpression.get("object").isIdentifier({ name: "module" }) &&
          pMemberExpression.get("property").isIdentifier({ name: "exports" })
        ) {
          return [pExpressionStatement];
        }
      }

      return [];
    }
  },
  ["handleConfigResolution"]: (p: NodePath) => {
    if (
      p.isProgram()
    ) {
      const pVariableDeclaration = p.get("body").find((item) => (
        item.isVariableDeclaration() &&
        (item.get("declarations.0.id") as NodePath).isIdentifier({ name: "handleConfigResolution" })
      ));

      if (pVariableDeclaration) {
        return [pVariableDeclaration];
      }

      return [];
    }
  },
  ["configFileLoaded"]: (p: NodePath) => {
    if (
      p.isProgram()
    ) {
      const pModuleExports = p.get("body").find(($, i, items) => i === items.length - 1) as NodePath<t.ExpressionStatement>;
      const pIfCheckConfigFileLoaded = pModuleExports?.get("expression.right.body.body").find((item) => (
        item.isIfStatement() &&
        item.get("test").isUnaryExpression() &&
        t.isIdentifier((item.get("test.argument") as NodePath).node, { name: "configFileLoaded" })
      ));

      return pIfCheckConfigFileLoaded ? [pIfCheckConfigFileLoaded] : [];
    }
  },
};

type TargetPatch = Record<Target, (targets: NodePath[]) =>  void>;

export const targetPatch: TargetPatch = {
  ["WebpackCLI.resolveConfig"]: (targets: NodePath[]) => {
    const pIfCheckConfigName = targets[0].get("body.body.4") as NodePath<t.IfStatement>;
    const astAirpackMerge = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);

      Object.assign(config, mergeConfig(config));
    `);

    // insert airpack merge before `if (options.configName) {...}`
    pIfCheckConfigName.insertBefore(astAirpackMerge);

    const astPrint = template.ast(`
      if (process.env.AIRPACK_PRINT === "true") {
        printConfig(config);
        process.exit();
      }
    `) as t.IfStatement;

    // remove `if (options.merge) {...}`, and insert airpack print
    pIfCheckConfigName.getNextSibling().replaceWith(astPrint);
  },
  ["module.exports"]: (targets: NodePath[]) => {
    const pCallResolveConfigMerging = targets[0].get("expression.right.body.body.1") as NodePath<t.ExpressionStatement>;
    const astAirpack = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);
      const { options } = mergeConfig({ options: opts.options });

      opts.options = options;

      if (process.env.AIRPACK_PRINT === "true") {
        printConfig({ options });
        process.exit();
      }
    `);

    // insert airpack before `await resolveConfigMerging(args);`, and remove original merge
    pCallResolveConfigMerging.insertBefore(astAirpack);
    pCallResolveConfigMerging.remove();
  },
  ["handleConfigResolution"]: (targets: NodePath[]) => {
    const pCallResolveConfigMerging = targets[0].get("declarations.0.init.body.body.1") as NodePath<t.ExpressionStatement>;
    const astAirpack = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);
      const { options } = mergeConfig({ options: opts.options });

      opts.options = options;

      if (process.env.AIRPACK_PRINT === "true") {
        printConfig({ options });
        process.exit();
      }
    `);

    // insert airpack before `await resolveConfigMerging(args);`, and remove original merge
    pCallResolveConfigMerging.insertBefore(astAirpack);
    pCallResolveConfigMerging.remove();
  },
  ["configFileLoaded"]: (targets: NodePath[]) => {
    const pIfCheckConfigFileLoaded = targets[0];
    const code = template.ast(`
      if (!configFileLoaded) {
        return processConfiguredOptions();
      } else {
        const { mergeConfig, printConfig } = require(process.env.AIRPACK);
        const { options: mergedOptions } = mergeConfig({ options });

        if (process.env.AIRPACK_PRINT === "true") {
          printConfig({ options: mergedOptions });
          process.exit();
        }

        return processConfiguredOptions(mergedOptions);
      }
    `) as t.IfStatement;

    pIfCheckConfigFileLoaded.replaceWith(code);
  },
};

export const getTargets = (ast: t.File, target: Target) => {
  const findTargets = targetTest[target];
  const targets: NodePath[] = [];

  traverse(ast, {
    enter(p) {
      const foundTargets = findTargets(p);

      if (foundTargets) {
        targets.push(...foundTargets);

        p.stop();
      }
    }
  });

  return targets;
};

export const getTargetsHash = (targets: NodePath[]) => {
  return sha1(targets.map(p => p.toString()).join(""));
};
