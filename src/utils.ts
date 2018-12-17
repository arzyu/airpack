import fs from "fs";
import { resolve } from "path";

export const getPackageInfo = (packagePath: string) =>
    JSON.parse(fs.readFileSync(resolve(packagePath, "package.json"), { encoding: "utf8" }));
