declare const $processConfiguredOptions: (options: object) => object;

function processConfiguredOptions(localOptions: object | object[] | undefined) {
  const options = require(process.env.ZEROPACK as string).zeropack(localOptions);
  const finalOptions = $processConfiguredOptions(options);

  if (process.env.ZEROPACK_PRINT === "true") {
    console.dir(finalOptions, { depth: null, color: true });
    process.exit(0);
  }

  return finalOptions;
}
