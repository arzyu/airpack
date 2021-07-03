import { NodePath } from "@babel/traverse";

declare module "@babel/traverse" {
  interface NodePath {
    getPrevSibling(): NodePath;
    getNextSibling(): NodePath;
  }
}
