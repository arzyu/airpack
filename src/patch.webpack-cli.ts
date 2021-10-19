import chalk from "chalk";
import { parse } from "@babel/parser";
import generate from "@babel/generator";

import { getMatchedFiles, getMatchedHashes, getMatchedTargets, isFutureVersion } from "./specs";
import { targetPatch, getTargets, getTargetsHash } from "./adapter";

export const patch = (code: string, filename: string) => {
  const printUnsupportedMessage = () => {
    console.error(chalk`[airpack]: {gray Did you use the latest version of airpack? If so, please go to}`);
    console.error(chalk`[airpack]: {gray https://github.com/arzyu/airpack/issues to report this error.}`);
  };

  const wpc = process.env.AIRPACK_WPC;
  const wpcVersion = process.env.AIRPACK_WPC_VERSION!;
  const files = getMatchedFiles(wpcVersion);
  const patchIndex = files.indexOf(filename);

  const target = getMatchedTargets(wpcVersion)[patchIndex];

  if (!target) {
    console.error(chalk`[airpack]: {red No targets defined in specs for file "${filename}"}`);
    printUnsupportedMessage();
    process.exit()
  }

  const ast = parse(code);
  const pTargets = getTargets(ast, target);

  if (!pTargets.length) {
    console.error(chalk`[airpack]: {red No targets matched to the target "${target}"}`);
    printUnsupportedMessage();
    process.exit()
  }

  const hash = getMatchedHashes(wpcVersion)[patchIndex];

  if (!hash) {
    console.error(chalk`[airpack]: {red No hash defined in specs for the target "${target}"}`);
    process.exit()
  }

  const pTargetsHash = getTargetsHash(pTargets);

  if (pTargetsHash !== hash) {
    if (isFutureVersion(wpcVersion)) {
      console.error(chalk`[airpack]: {red Target "${target}" has changed since the version of "${wpc}@${wpcVersion}"}`);
      printUnsupportedMessage();
      process.exit()
    }
    console.error(chalk`[airpack]: {red Hash not matched to the target "${target}"}`);
    console.error(chalk`[airpack]: {green ${pTargetsHash}} {gray <-} {red ${hash}}`);
    process.exit()
  }

  targetPatch[target](pTargets);

  const { code: newCode } = generate(ast, { comments: false });

  return newCode;
};
