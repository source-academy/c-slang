interface PegUtilError {
  line: number;
  column: number;
  message: string;
  found: string;
  expected: string;
  location: {
    prolog: string;
    token: string;
    epilog: string;
  };
}

declare module "pegjs-util" {
  export function parse(
    parser: PEG.Parser,
    source: string,
    options?: PEG.ParserOptions,
  ): {
    ast: unknown;
    error: PegUtilError;
  };

  export function errorMessage(
    e: PegUtilError,
    noFinalNewline: boolean,
  ): string;
}
