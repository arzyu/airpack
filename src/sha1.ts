import { createHash } from "crypto";

export const sha1 = (content: string) => createHash("sha1").update(content).digest("base64");
