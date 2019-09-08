import merge from "webpack-merge";

import { getConfigs } from "./get-configs";

export const zeroWebpack = (options: object | object[] | undefined) => {
  const config = merge(...getConfigs());

  if (!options) return config;

  if (Array.isArray(options)) {
    if (options.length === 1) return merge(config, options[0]);

    return [merge(config, options[0]), ...options.slice(1)];
  }

  return merge(config, options as object);
};
