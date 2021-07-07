import { minVersion, minSatisfying, maxSatisfying, satisfies, SemVer } from "semver";

import { Target } from "./adapter";

type VersionDict<T = string> = { [range: string]: T[] };

const files: VersionDict = {
  ">4.7.2": ["lib/webpack-cli.js"], // handle future versions
  ">=4.3.0 <=4.7.2": ["lib/webpack-cli.js"],
  "4.2.0": ["lib/groups/resolveConfig.js"],
  ">=4.0.0 <=4.1.0": ["lib/groups/ConfigGroup.js"],
  ">=3.3.1 <=3.3.12": ["bin/utils/convert-argv.js"],
  "3.3.0": ["bin/convert-argv.js"],
};

const targets: VersionDict<Target> = {
  ">4.7.2": ["WebpackCLI.resolveConfig"], // handle future versions
  ">=4.3.0 <=4.7.2": ["WebpackCLI.resolveConfig"],
  ">=4.1.0 <=4.2.0": ["module.exports"],
  "4.0.0": ["handleConfigResolution"],
  ">=3.3.7 <=3.3.12": ["configFileLoaded"],
  ">=3.3.0 <=3.3.6": ["configFileLoaded~1"],
};

const hashes: VersionDict = {
  ">4.7.2": ["PdWKX+Iet4AbhXI71luKErvq22c="], // handle future versions
  ">=4.7.1 <=4.7.2": ["PdWKX+Iet4AbhXI71luKErvq22c="],
  ">=4.6.0 <=4.7.0": ["ubAoOcH7DL7wlX4BxX2FHggRo/c="],
  "4.5.0": ["3gvgTuoaJxCUMHISiOWBvLXla9U="],
  "4.4.0": ["PnEhMbqUYVg7yE2E8RcJq5DxIYk="],
  "4.3.1": ["alXehzyVc8VPgcpSm+uavSNMS9o="],
  "4.3.0": ["f1IBdo+sfSo5kV3MDJYTTUSHlnQ="],
  ">=4.1.0 <=4.2.0": ["D5K0xMHEYZ3oKccEBCFQMLFn+pQ="],
  "4.0.0": ["Lfv4iFCtCCQ7xJauDSWeWaA9zaM="],
  ">=3.3.7 <=3.3.12": ["Ji3bvavuYLReMnchNbF/KlIhTis="],
  ">=3.3.0 <=3.3.6": ["klJ7dM4tvXZZi6Zeg8ezskDH5jQ="]
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
