import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import template from "@babel/template";

import { sha1 } from "./sha1";

export type Target = "WebpackCLI.resolveConfig"
  | "WebpackCLI.resolveConfig~1"
  | "WebpackCLI.loadConfig"
  | "module.exports"
  | "handleConfigResolution"
  | "configFileLoaded"
  | "configFileLoaded~1"
;

export type TargetTest = Record<Target, (p: NodePath) => NodePath[] | void>;

export const targetTest: TargetTest = {
  ["WebpackCLI.resolveConfig"]: (p: NodePath) => {
    if (
      p.isClassDeclaration() &&
      t.isIdentifier(p.get("id").node, { name: "WebpackCLI" })
    ) {
      const pMethodResolveConfig = p.get("body.body").find((item) => (
        item.isClassMethod() &&
        t.isIdentifier(item.get("key").node, { name: "resolveConfig" })
      ));

      return pMethodResolveConfig ? [pMethodResolveConfig] : [];
    }
  },

  ["WebpackCLI.resolveConfig~1"]: (p: NodePath) => targetTest["WebpackCLI.resolveConfig"](p),

  ["WebpackCLI.loadConfig"]: (p: NodePath) => {
    if (
      p.isClassDeclaration() &&
      t.isIdentifier(p.get("id").node, { name: "WebpackCLI" })
    ) {
      const pMethodLoadConfig = p.get("body.body").find((item) => (
        item.isClassMethod() &&
        t.isIdentifier(item.get("key").node, { name: "loadConfig" })
      ));

      return pMethodLoadConfig ? [pMethodLoadConfig] : [];
    }
  },

  ["module.exports"]: (p: NodePath) => {
    if (
      p.isProgram()
    ) {
      const pModuleExports = p.get("body").find((item) => (
        item.isExpressionStatement() &&
        t.isIdentifier((item.get("expression.left.object") as NodePath)?.node, { name: "module" }) &&
        t.isIdentifier((item.get("expression.left.property") as NodePath)?.node, { name: "exports" })
      ));

      return pModuleExports ? [pModuleExports] : [];
    }
  },

  ["handleConfigResolution"]: (p: NodePath) => {
    if (
      p.isProgram()
    ) {
      const pHandleConfigResolution = p.get("body").find((item) => (
        item.isVariableDeclaration() &&
        t.isIdentifier((item.get("declarations.0.id") as NodePath)?.node, { name: "handleConfigResolution" })
      ));

      return pHandleConfigResolution ? [pHandleConfigResolution] : [];
    }
  },

  ["configFileLoaded"]: (p: NodePath) => {
    if (
      p.isProgram()
    ) {
      const pModuleExports = p.get("body").find(($, i, items) => i === items.length - 1);
      const pIfCheckConfigFileLoaded = pModuleExports?.get("expression.right.body.body")?.find((item) => (
        item.isIfStatement() &&
        item.get("test").isUnaryExpression() &&
        t.isIdentifier((item.get("test.argument") as NodePath).node, { name: "configFileLoaded" })
      ));

      return pIfCheckConfigFileLoaded ? [pIfCheckConfigFileLoaded] : [];
    }
  },

  ["configFileLoaded~1"]: (p: NodePath) => targetTest["configFileLoaded"](p),
};

type TargetPatch = Record<Target, (targets: NodePath[]) =>  void>;

export const targetPatch: TargetPatch = {
  ["WebpackCLI.resolveConfig"]: (targets: NodePath[]) => {
    const pIfCheckConfigName = targets[0].get("body.body.4") as NodePath<t.IfStatement>;
    const astMerge = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);

      Object.assign(config, mergeConfig(config));
    `);

    // insert airpack merge before `if (options.configName) {...}`
    pIfCheckConfigName.insertBefore(astMerge);

    const astPrint = template.ast(`
      if (process.env.AIRPACK_PRINT === "true") {
        printConfig(config);
        process.exit();
      }
    `) as t.IfStatement;

    // remove `if (options.merge) {...}`, and insert airpack print
    pIfCheckConfigName.getNextSibling().replaceWith(astPrint);
  },

  ["WebpackCLI.resolveConfig~1"]: (targets: NodePath[]) => {
    const pIfCheckConfigName = targets[0].get("body.body.2") as NodePath<t.IfStatement>;
    const astMerge = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);

      Object.assign(config, mergeConfig(config));
    `);

    // insert airpack merge before `if (options.configName) {...}`
    pIfCheckConfigName.insertBefore(astMerge);

    const astPrint = template.ast(`
      if (process.env.AIRPACK_PRINT === "true") {
        printConfig(config);
        process.exit();
      }
    `) as t.IfStatement;

    // remove `if (options.merge) {...}`, and insert airpack print
    pIfCheckConfigName.getNextSibling().replaceWith(astPrint);
  },

  ["WebpackCLI.loadConfig"]: (targets: NodePath[]) => {
    const pIfCheckConfigName = targets[0].get("body.body.4") as NodePath<t.IfStatement>;
    const astMerge = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);

      Object.assign(config, mergeConfig(config));
    `);

    // insert airpack merge before `if (options.configName) {...}`
    pIfCheckConfigName.insertBefore(astMerge);

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
    const ast = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);
      const { options } = mergeConfig({ options: opts.options });

      opts.options = options;

      if (process.env.AIRPACK_PRINT === "true") {
        printConfig({ options });
        process.exit();
      }
    `);

    // insert airpack before `await resolveConfigMerging(args);`, and remove original merge
    pCallResolveConfigMerging.insertBefore(ast);
    pCallResolveConfigMerging.remove();
  },

  ["handleConfigResolution"]: (targets: NodePath[]) => {
    const pCallResolveConfigMerging = targets[0].get("declarations.0.init.body.body.1") as NodePath<t.ExpressionStatement>;
    const ast = template.ast(`
      const { mergeConfig, printConfig } = require(process.env.AIRPACK);
      const { options } = mergeConfig({ options: opts.options });

      opts.options = options;

      if (process.env.AIRPACK_PRINT === "true") {
        printConfig({ options });
        process.exit();
      }
    `);

    // insert airpack before `await resolveConfigMerging(args);`, and remove original merge
    pCallResolveConfigMerging.insertBefore(ast);
    pCallResolveConfigMerging.remove();
  },

  ["configFileLoaded"]: (targets: NodePath[]) => {
    const pIfCheckConfigFileLoaded = targets[0];
    const ast = template.ast(`
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

    pIfCheckConfigFileLoaded.replaceWith(ast);
  },

  ["configFileLoaded~1"]: (targets: NodePath[]) => {
    const pIfCheckConfigFileLoaded = targets[0];
    const ast = template.ast(`
      if (!configFileLoaded) {
        return processConfiguredOptions({});
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

    pIfCheckConfigFileLoaded.replaceWith(ast);
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
