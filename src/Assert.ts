class AssertError extends Error{
  constructor(msg: string) {
    super(msg);
  }
}

export function assert(filename: string, line: number, assertion: string, truth: boolean): boolean {
  if (!truth) {
    throw new AssertError(`assert(${assertion}) in '${filename}' at line ${line} failed.`);
  }
  return truth;
}
