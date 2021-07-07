import { promises as fsp } from "fs";
import { resolve } from "path";

import chalk from "chalk";
import { extract, packument } from "pacote";
import { parse } from "@babel/parser";

import { getMatchedFiles, getMatchedTargets, getMatchedHashes } from "../src/specs";
import { getTargets, getTargetsHash } from "../src/adapter";

export const getPackageVersions = async (pkg: string) => {
  const { versions } = await packument(pkg);

  return Object.keys(versions).filter(v => /^\d+\.\d+\.\d+$/.test(v));
};

export const downloadPackage = async (pkgSpec: string) => {
  const dest = resolve(`node_modules/.cache/airpack/${pkgSpec}`);
  await extract(pkgSpec, dest);
  return dest;
};

export const getFileContent = async (file: string) => {
  return await fsp.readFile(file, { encoding: "utf8" }).catch(() => null);
};

export const check = async (pkg: string, version: string) => {
  const pkgSpec = `${pkg}@${version}`;
  const dest = await downloadPackage(pkgSpec);
  const files = getMatchedFiles(version);

  console.log(chalk`[airpack-check]: {cyan Checking ${pkgSpec} ...}`);

  if (!files.length) {
    console.error(chalk`[airpack-check]: {red No files defined in specs}`);
    process.exit();
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const code = await getFileContent(resolve(dest, file));

    if (typeof code !== "string") {
      console.error(chalk`[airpack-check]: {red File not found: "${file}"}`);
      continue;
    }

    const target = getMatchedTargets(version)[i];

    if (!target) {
      console.error(chalk`[airpack-check]: {red No targets defined in specs for file "${file}"}`);
      continue;
    }

    const ast = parse(code);
    const pTargets = getTargets(ast, target);

    if (!pTargets.length) {
      console.error(chalk`[airpack-check]: {red No targets matched to the target "${target}"}`);
      continue;
    }

    const pTargetsHash = getTargetsHash(pTargets);
    const hash = getMatchedHashes(version)[i];

    if (hash) {
      if (pTargetsHash !== hash) {
        console.error(chalk`[airpack-check]: {red Hash not matched to the target "${target}"}`);
        console.error(chalk`[airpack-check]: {green ${pTargetsHash}} {gray <-} {red ${hash}}`);
        continue;
      }

      console.log(chalk`[airpack-check]: {green Hash matched to the target "${target}"}`);
      console.log(chalk`[airpack-check]: {green ${pTargetsHash}}`);
    } else {
      console.log(chalk`[airpack-check]: {cyan Hash has generated, you would write it to specs now:}`);
      console.log(chalk`[airpack-check]: {cyan ${pTargetsHash}}`);
    }
  }
};
