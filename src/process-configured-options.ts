declare const $processConfiguredOptions: (options: object) => object;

function processConfiguredOptions(localOptions: object | object[] | undefined) {
  const options = require(process.env.AIRPACK as string).airpack(localOptions);
  const finalOptions = $processConfiguredOptions(options);

  if (process.env.AIRPACK_PRINT === "true") {
    console.dir(finalOptions, { depth: null, color: true });
    process.exit(0);
  }

  return finalOptions;
}
