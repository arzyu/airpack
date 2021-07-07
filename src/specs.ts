import { minVersion, minSatisfying, maxSatisfying, satisfies, SemVer } from "semver";

import { Target } from "./adapter";

type VersionDict<T = string> = { [range: string]: T[] };

const files: VersionDict = {
  ">4.7.2": ["lib/webpack-cli.js"], // handle future versions
  ">=4.3.0 <=4.7.2": ["lib/webpack-cli.js"],
  ">=4.1.0 <=4.2.0": ["lib/groups/resolveConfig.js"],
  "4.0.0": ["lib/groups/ConfigGroup.js"],
  ">=3.3.7 <=3.3.12": ["bin/utils/convert-argv.js"],
};

const targets: VersionDict<Target> = {
  ">4.7.2": ["WebpackCLI.resolveConfig"], // handle future versions
  ">=4.3.0 <=4.7.2": ["WebpackCLI.resolveConfig"],
  ">=4.1.0 <=4.2.0": ["module.exports"],
  "4.0.0": ["handleConfigResolution"],
  ">=3.3.7 <=3.3.12": ["configFileLoaded"],
};

const hashes: VersionDict = {
  ">4.7.2": ["eGtDnA0PxaXmK857tBJWhNOcVJY="], // handle future versions
  ">=4.7.1 <=4.7.2": ["eGtDnA0PxaXmK857tBJWhNOcVJY="],
  ">=4.6.0 <=4.7.0": ["R8gPwb7l8Z8fOpJSu8ZOlCFoSeA="],
  "4.5.0": ["vvvTC+rcp1lMMcXw5FeUzwqpGVs="],
  "4.4.0": ["gDNnbEVRbMYcjgYPvOtIrFhxZ1Q="],
  "4.3.1": ["gRCKJYSGq1A7qt6rAQA4Ta6ZnCM="],
  "4.3.0": ["UAqNLevYHDlG2B/ttXFeKpJykXs="],
  ">=4.1.0 <=4.2.0": ["D5K0xMHEYZ3oKccEBCFQMLFn+pQ="],
  "4.0.0": ["Lfv4iFCtCCQ7xJauDSWeWaA9zaM="],
  ">=3.3.7 <=3.3.12": ["Ji3bvavuYLReMnchNbF/KlIhTis="],
};

export const getMinVersion = () => {
  const minVersions = Object.keys(targets).map(range => minVersion(range)!);
  return minSatisfying<SemVer>(minVersions, ">0.0.0")!.version;
};

export const getFutureVersionsRange = () => {
  const minVersionsDict = Object.keys(targets).reduce(
    (dict: { [v: string]: string }, range) => {
      dict[minVersion(range)!.version] = range;
      return dict;
    },
    {}
  );
  const maxVersion = maxSatisfying(Object.keys(minVersionsDict), ">0.0.0")!;
  return minVersionsDict[maxVersion];
};

export const getMatchedFiles = (version: string) => {
  const matchedRange = Object.keys(files).find(range => satisfies(version, range))
  return matchedRange ? files[matchedRange] : [];
}

export const getMatchedTargets = (version: string) => {
  const matchedRange = Object.keys(targets).find(range => satisfies(version, range))
  return matchedRange ? targets[matchedRange] : [];
}

export const getMatchedHashes = (version: string) => {
  const matchedRange = Object.keys(hashes).find(range => satisfies(version, range))
  return matchedRange ? hashes[matchedRange] : [];
}
