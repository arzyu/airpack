import chalk from "chalk";

import { merge } from "webpack-merge";

type Options = {
  name?: string,
  [p: string]: any,
}

type Config = {
  options: Options | Options[],
  path?: WeakMap<object, string | string[]>,
}

type MergedConfig = {
  options: Options,
  paths?: string[],
};

type AtLeastOne<T> = [T, ...T[]];

export const mergeConfig = (config: Config) => {
  if (!Array.isArray(config.options)) {
    return config;
  }

  const hasPath = !!config.path;

  const UNDEFINED_NAME = "undefined";

  // step 1: group config options by name
  const grouped = config.options.reduce((dict, options, i) => {
    const key = options.name ? options.name : UNDEFINED_NAME;

    return dict.set(key, [...(dict.get(key) || []), options]);
  }, new Map<string, Options[]>());

  // step 2: merge config options from same group
  const merged = new Map<string, MergedConfig>();

  for (const [key, options] of grouped) {
    const mergedConfig: MergedConfig = {
      options: options.length > 1 ? merge(...(options as AtLeastOne<Options>)) : options[0]
    };

    if (hasPath) {
      mergedConfig.paths = options.map(opts => config.path!.get(opts) as string);
    }

    merged.set(key, mergedConfig);
  }

  // step 3: merge UNDEFINED_NAME options into all others
  const nonameOptions = merged.get(UNDEFINED_NAME);

  if (nonameOptions && merged.size > 1) {
    merged.delete(UNDEFINED_NAME);

    for (const [key, config] of merged) {
      const mergedConfig: MergedConfig = {
        options: merge(nonameOptions.options, config.options)
      };

      if (hasPath) {
        mergedConfig.paths = [...nonameOptions.paths!, ...config.paths!];
      }

      merged.set(key, mergedConfig);
    }
  }

  // step 4: generate results
  const resultConfig: Config = { options: [] };

  if (hasPath) {
    resultConfig.path = new WeakMap();
  }

  for (const [key, { options, paths }] of merged) {
    resultConfig.options.push(options);

    if (hasPath) {
      resultConfig.path!.set(options, paths!.length > 1 ? paths! : paths![0])
    }
  }

  if (resultConfig.options.length === 1) {
    resultConfig.options = (resultConfig.options as Options[])[0];
  }

  return resultConfig;
};

export const printConfig = (config: Config) => {
  const { options, path } = config;
  const print = (obj: any) => console.dir(obj, { depth: null, color: true });

  console.log(chalk`[airpack]: {cyan Effective webpack config:}`)
  print(options);

  if (path) {
    console.log(chalk`\n[airpack]: {cyan Effective webpack config paths:}`)
    print(Array.isArray(options) ? options.map(opts => path.get(opts)) : path.get(options));
  } else {
    console.log(chalk`\n[airpack]: {gray No webpack config paths provided.}`)
  }
};
