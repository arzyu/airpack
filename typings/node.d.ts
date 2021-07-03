declare namespace NodeJS {
  interface Module {
    _compile(content: string, filename: string): void;
  }

  namespace Module {
    export function _resolveFilename(require: string, parent: Module): string;
  }
}
