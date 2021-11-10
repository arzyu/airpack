# airpack

![npm package version](https://img.shields.io/npm/v/airpack) ![npm peer dependency version](https://img.shields.io/npm/dependency-version/airpack/peer/webpack-cli) ![build status](https://img.shields.io/github/workflow/status/arzyu/airpack/Build)

airpack is a wrapper for webpack-cli. Designed to allow you to use webpack more elegantly.

When airpack loads the webpack-cli module on the node, it adds functional enhancement patches to webpack-cli. This patch allows webpack-cli to automatically read webpack configurations from multiple locations (project dependencies, project directories, command line parameters) in a certain priority order, and then merge these webpack configurations [in a more appropriate way](#configuration-file-merge-logic).

There are many benefits to using webpack configuration in this way:

 * The project directory will be cleaner, with only project-related logic, no `.babelrc.*`, `postcss.config.js`, `.eslintrc.*`,..., and even `webpack.config.*` is not needed. Project templated will be more convenient. See [react-webpack-playground](https://github.com/arzyu/react-webpack-playground).

 * With fewer `devDependencies`, the length of the dependency list is shortened from one arm to one finger, and all dependencies related to webpack configuration are placed in a separate `webpack-config-*` package.

 * Using a separate `webpack-config-*` package is easier to manage, version control and iteration will be more convenient, and it will also facilitate sharing. It is more appropriate to publish the package under your own or organization's name, such as [@arzyu/webpack-config-web](https://github.com/arzyu/webpack-config-web). Complex configurations can also be split into multiple packages, and airpack can help you merge them.

## Installation

```shell
npm add --save-dev airpack
```

## Usage & How it works

```shell
# view help
$(npm bin)/airpack --help
```
```
Usage: airpack [options] [other-webpack-options]

Options:
  -s, --server                    Run webpack-dev-server
  -c, --config <file|package...>  Specify webpack configs (default: [])
  --no-autoconfig                 Only load webpack configs from '-c, --config ...' option
  --print                         Print webpack configs with paths, without running webpack
  -v, --version                   Print airpack version
  -h, --help                      Print this help
```

Taking the webpack configuration [@arzyu/webpack-config-web](https://github.com/arzyu/webpack-config-web) as an example, `package.json` should look like this:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development airpack --server",
    "build": "NODE_ENV=production airpack"
  },
  "devDependencies": {
    "@arzyu/webpack-config-web": "^0.1.3",
    "airpack": "^1.0.1",
    "webpack": "^5.33.2",
    "webpack-cli": "^4.7.2",
    "webpack-dev-server": "^3.11.2"
  },
}
```

* `npm run dev`, start local development service (invoke `webpack serve`)
* `npm run build`, run packaging (invoke `webpack`)

### Configuration file search order and priority

When using airpack without specifying the `--no-autoconfig` parameter, it will help us automatically collect the webpack configuration. The logical sequence is as follows:

 * Find **all** `webpack-config-*` items in the project's dependencies and add them to the end of the configuration list

 * If there is a `webpack.config.*` file in the project root directory, **the one** recognized by webpack as the default configuration will be appended to the end of the configuration list

 * If there are webpack configuration files or packages imported with `airpack -c, --config`, add **them** to the end of the configuration list in turn

In the configuration list, the lower configuration has a higher priority and will overwrite the items in the previous configuration when merging.

In the above example, if we run `airpack -c file-a.js -c package-b -c package-c/internal`, we may get a configuration list like this:

```json
[
  "@arzyu/webpack-config-web",
  "webpack.config.js",
  "file-a.js",
  "package-b",
  "package-c/internal"
]
```

Note: `airpack -c package-c/internal` is a way of introducing configuration, which allows you to include multiple webpack configurations in one package. In a typical scenario, for example, when doing electron-related development, you can make a `webpack-config-electron` package. In this package, write two configurations, `webpack-config-eletron/main` and `webpack-config-eletron/renderer`.

If you don't want airpack to automatically collect the webpack configuration, you can use the `--no-autoconfig` parameter, which must be used with the `-c, --config` parameter to manually specify the configuration file.

```shell
airpack --no-autoconfig -c config-a -c config-b
```

In this way, the final webpack configuration list is `["config-a", "config-b"]`.

### Configuration file merge logic

After collecting the list of webpack configurations, we need to perform a merge operation on these configurations.

Although webpack-cli provides the `--merge` parameter to implement the function of merging configuration, the way of merging configuration is simply to merge all configurations into one object, so that webpack's multi-configuration function cannot be used. Therefore, airpack rewrite the merge logic, only merge the configuration objects with the same `name` attribute, and merge the configuration objects without the `name` attribute into all other configuration objects. The specific steps are as follows.

Suppose we have collected such a configuration list content:

```js
[
  { "a": "from a", "x": "override by a" },
  { "b": "from b", "x": "override by b", name: "group_1" },
  { "c": "from c", "x": "override by c", name: "group_2" },
  { "d": "from d", "x": "override by d" },
  { "e": "from e", "x": "override by e", name: "group_1" },
]
```

Step 1. Group all configuration objects according to the `name` attribute, and keep the priority order in the group:

```js
{
  "undefined": [
    { "a": "from a", "x": "override by a" },
    { "d": "from d", "x": "override by d" }
  ],
  "group_1": [
    { "b": "from b", "x": "override by b", "name": "group_1" },
    { "e": "from e", "x": "override by e", "name": "group_1" }
  ],
  "group_2": [
    { "c": "from c", "x": "override by c", "name": "group_2" }
  ]
}
```

Step 2. Merge each group separately:

```js
{
  "undefined": {
    "a": "from a",
    "d": "from d",
    "x": "override by d"
  },
  "group_1": {
    "b": "from b",
    "e": "from e",
    "x": "override by e",
    "name": "group_1"
  },
  "group_2": {
    "c": "from c",
    "x": "override by c",
    "name": "group_2"
  }
}
```

Step 3. Combine the `undefined` group without the `name` attribute with other groups respectively to get the final webpack configuration:

```js
[
  {
    "a": "from a",
    "d": "from d",
    "b": "from b",
    "e": "from e",
    "x": "override by e",
    "name": "group_1"
  },
  {
    "a": "from a",
    "d": "from d",
    "c": "from c",
    "x": "override by c",
    "name": "group_2"
  }
]
```

Note: If all configuration objects in the configuration list do not have a `name` attribute, all configuration objects will be merged into one object, which is the same as the merge logic of webpack-cli.

## License

MIT
