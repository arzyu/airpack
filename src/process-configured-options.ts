declare const $processConfiguredOptions: (options: object) => object;

function processConfiguredOptions(localOptions: object | object[] | undefined) {
  const options = require(process.env.ZERO_WEBPACK as string).zeroWebpack(localOptions);
  return $processConfiguredOptions(options);
}
