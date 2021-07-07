#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { validRange, satisfies } from "semver";

import { getFutureVersionsRange } from "../src/specs";
import { getPackageVersions, check } from "./utils";

const program = new Command("airpack-check");

program
  .usage("<sem-version|sem-version-range...>")
  .description("Check webpack-cli versions.")
  .option("--print", "Print all versions of webpack-cli")
  .option("--print-newer", "Print newer versions of webpack-cli")
  .helpOption("-h, --help", "Print this help")
  .parse(process.argv);

const opts = program.opts();

(async () => {
  const wpc = "webpack-cli";

  if (opts.print) {
    const versions = await getPackageVersions(wpc);

    console.log(versions);
    process.exit();
  }

  if (opts.printNewer) {
    const versions = await getPackageVersions(wpc);
    const futureRange = getFutureVersionsRange();
    const newerVersions = versions.filter(v => satisfies(v, futureRange));

    if (newerVersions.length) {
      console.log(newerVersions);
    } else {
      console.log(chalk`[airpack-check]: {gray No newer versions}`);
    }

    process.exit();
  }

  const rangesForChecking = program.args.length ? program.args : [getFutureVersionsRange()];
  const invalidRange = rangesForChecking.find(range => !validRange(range));

  if (invalidRange) {
    console.error(chalk`[airpack-check]: {red Invalid version range "${invalidRange}"}`);
    process.exit();
  }

  const versions = await getPackageVersions(wpc);
  const vMatched = rangesForChecking.reduce<string[]>((result, range) => {
    const matched = versions.filter(version => satisfies(version, range));
    return [...result, ...matched];
  }, []);

  if (!vMatched.length) {
    console.error(chalk`[airpack-check]: {red No matched versions}`);
    process.exit();
  }

  new Set(vMatched).forEach((version) => {
    check(wpc, version);
  });

})();

/* -*- ts -*- */
