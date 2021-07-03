import { merge } from "webpack-merge";

interface Options {
  name?: string;
  [p: string]: any;
}

interface Config {
  options: Options | Options[],
  path: WeakMap<object, string | string[]>
}

type AtLeastOne<T> = [T, ...T[]];

export const airpackMerge = (config: Config) => {
  if (!Array.isArray(config.options)) {
    return config;
  }

  const UNDEFINED_NAME = "undefined";

  const groups = config.options.reduce((dict, options, i) => {
    const key = options.name ? options.name : UNDEFINED_NAME;

    return dict.set(key, [...(dict.get(key) || []), options]);
  }, new Map<string, Options[]>());

  const merged = new Map<string, { options: Options, paths: string[] }>();

  // merge config options in same group
  for (const [key, options] of groups) {
    merged.set(key, {
      options: options.length > 1 ? merge(...(options as AtLeastOne<Options>)) : options[0],
      paths: options.map(opts => config.path.get(opts) as string)
    });
  }

  const nonameOptions = merged.get(UNDEFINED_NAME);

  if (nonameOptions && merged.size > 1) {
    merged.delete(UNDEFINED_NAME);

    // merge UNDEFINED_NAME into all others
    for (const [key, config] of merged) {
      merged.set(key, {
        options: merge(nonameOptions.options, config.options),
        paths: [...nonameOptions.paths, ...config.paths]
      });
    }
  }

  const resultConfig: Config = {
    options: [],
    path: new WeakMap()
  };

  for (const [key, { options, paths }] of merged) {
    resultConfig.options.push(options)
    resultConfig.path.set(options, paths.length > 1 ? paths : paths[0])
  }

  if (resultConfig.options.length === 1) {
    resultConfig.options = (resultConfig.options as Options[])[0];
  }

  return resultConfig;
};
