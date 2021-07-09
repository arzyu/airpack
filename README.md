# airpack

>支持 `webpack-cli` 版本 `>= 3.0.0`

airpack 是一个 webpack-cli 的包装器。旨在让你更优雅的使用 webpack。

airpack 在 node 加载 webpack-cli 模块时，给 webpack-cli 打上功能增强补丁。这个补丁让 webpack-cli 能按一定的优先级顺序自动从多个位置（项目依赖、项目目录、命令行参数）读取 webpack 配置，然后用[**更合适的方式**](#配置文件合并逻辑)合并这些 webpack 配置。

通过这种方式使用 webpack 配置会有很多好处：

 * 项目目录会更干净，只有项目相关的逻辑，没有 `.babelrc.*`、`postcss.config.js`、`.eslintrc.*`、…，甚至也不需要 `webpack.config.*`。项目模板化会更方便。可以参看范例项目：[arzyu/react-webpack-playground](https://github.com/arzyu/react-webpack-playground)。

 * 使用更少的 `devDependencies`，依赖列表的长度从一个胳膊缩短到了一根手指，所有与 webpack 配置相关的依赖都放在独立的 `webpack-config-*` 包中。

 * 使用独立的 `webpack-config-*` 包更容易管理，版本控制、迭代会更方便，同时也利于分享。将包发布到自己或组织的名下更合适，可以参考范例配置：[@arzyu/webpack-config-web](https://github.com/arzyu/webpack-config-web)。复杂的配置还可以拆分为多个包，airpack 能帮你合并它们。

## 安装

```shell
npm add --save-dev airpack
```

## 使用方法与运行机制

```shell
# 查看使用帮助
$(npm bin)/airpack --help
```
```
Usage: airpack [options] [other-webpack-options]

Solution for modular webpack configuration. Give webpack the ability to read configs from dependencies, and merge them in a more appropriate way.

Options:
  -s, --server                    Run webpack-dev-server
  -c, --config <file|package...>  Specify webpack configs (default: [])
  --no-autoconfig                 Only load webpack configs from '-c, --config ...' option
  --print                         Print webpack configs with paths, without running webpack
  -v, --version                   Print airpack version
  -h, --help                      Print this help
```

以使用 [@arzyu/webpack-config-web](https://github.com/arzyu/webpack-config-web) 这个 webpack 配置为例，`package.json` 看起来应该是这样的：

```json
{
  "scripts": {
    "dev": "NODE_ENV=development airpack --server",
    "build": "NODE_ENV=production airpack"
  },
  "devDependencies": {
    "@arzyu/webpack-config-web": "^0.1.3",
    "airpack": "^1.0.1",
    "webpack-cli": "^4.7.2",
    "webpack-dev-server": "^3.11.2"
  },
}
```

* `npm run dev`，启动本地开发服务（调用 `webpack serve`）
* `npm run build`，运行打包（调用 `webpack`）

### 配置文件查找顺序与优先级

使用 airpack 不指定 `--no-autoconfig` 参数时，它会帮我们自动搜集 webpack 配置，逻辑顺序如下：

 * 查找项目依赖中**所有的** `webpack-config-*` 项目，依次加入配置列表末尾
 * 如果项目根目录中有 `webpack.config.*` 文件，被 `webpack` 识别为默认配置的那**一个**会被追加到配置列表末尾
 * 如果有使用 `airpack -c, --config` 引入的 webpack 配置文件或包，依次将**它们**加入配置列表末尾

在配置列表中，靠后的配置优先级更高，在合并时会覆盖前面配置中的项目。
上面的范例中，如果我们运行 `airpack -c file-a.js -c package-b -c package-c/internal`，可能会得到这样的配置列表：

```json
[
  "@arzyu/webpack-config-web",
  "webpack.config.js",
  "file-a.js",
  "package-b",
  "package-c/internal"
]
```

注意：`airpack -c package-c/internal` 这种引入配置的方式，可以让你在一个包中包含多个 webpack 配置。典型的场景比如在做 electron 相关的开发时，你可以制作一个 `webpack-config-electron` 包，这个包中写两个配置，`webpack-config-eletron/main` 和 `webpack-config-eletron/renderer`。

如果你不想让 airpack 自动搜集 webpack 配置，可以使用 `--no-autoconfig` 参数，这种方式必需配合 `-c, --config` 参数来手动指定配置文件。

```shell
airpack --no-autoconfig -c config-a -c config-b
```

这样，最终的 webpack 配置列表就是 `["config-a", "config-b"]`。

### 配置文件合并逻辑

搜集完成 webpack 配置列表，需要对这些配置执行合并操作。

虽然 webpack-cli 有提供 `--merge` 参数来实现合并配置的功能，但是其合并配置的方式只是简单的把所有的配置合并到一个对象当中，这样 webpack 的多配置功能就无法使用了。所以 airpack 重做了合并逻辑，只合并相同 `name` 属性的配置对象，并将无 `name` 属性的配置对象合并到所有其它的配置对象中，具体步骤如下例子。

假定我们搜集到了这样的一个配置列表内容：

```js
[
  { "a": "from a", "x": "override by a" },
  { "b": "from b", "x": "override by b", name: "group_1" },
  { "c": "from c", "x": "override by c", name: "group_2" },
  { "d": "from d", "x": "override by d" },
  { "e": "from e", "x": "override by e", name: "group_1" },
]
```

Step 1，将所有配置对象按 `name` 属性分组，组内保持优先顺序：

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

Step 2，分别合并各个分组：

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

Step 3，将没有 `name` 属性的 `undefined` 分组分别和其它的分组合并，得到最终的 webpack 配置：

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

注意：如果配置列表中所有的配置对象都没有 `name` 属性，那么所有配置对象会被合并进一个对象，这与 webpack-cli 的合并逻辑相同。

## License

MIT
