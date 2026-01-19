declare module 'unidiff' {
  export function diffLines(oldLines: string[], newLines: string[]): any;
  export function formatLines(diff: any, options?: { context?: number }): string;
}
