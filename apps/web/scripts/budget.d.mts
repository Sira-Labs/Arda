export interface Sizes {
  entryScript: number;
  entryStyle: number;
  catalogs: Record<string, number>;
}
export const LIMITS: { entryScript: number; entryStyle: number; catalog: number };
export function measure(dist: URL): Sizes;
export function over(sizes: Sizes, limits?: typeof LIMITS): string[];
