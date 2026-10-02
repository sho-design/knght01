// Shared helpers for the page templates.
import { getCollection, type CollectionEntry } from 'astro:content';
import categoriesJson from '../data/categories.json';

export const CDN = 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW';
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const LAYER_NAMES = ['Lore', 'Law', 'Language', 'Map', 'Ground', 'Artifacts', 'Machinery'] as const;

export type Category = {
  short: string;
  label: string;
  rules: { title: string; text: string }[];
  Law?: string;
  Language?: string;
  Map?: string;
  Artifacts?: string;
};
export const CATEGORY = categoriesJson as Record<string, Category>;
export const CATEGORY_ORDER = ['clinic', 'medspa', 'law', 'spirits', 'coffee', 'food', 'fitness', 'creative'];

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;
export const getWorlds = async () => (await getCollection('worlds')).sort(byOrder);
export const getLayers = async () => (await getCollection('layers')).sort(byOrder);
export const getForPages = async () => (await getCollection('forPages')).sort(byOrder);
export const getRules = async () => (await getCollection('rules')).sort(byOrder);

export type World = CollectionEntry<'worlds'>;

/** Layer names (in codex order) with verified work for a world. */
export const worldLayers = (w: World) => LAYER_NAMES.filter((n) => n in w.data.built);

/** Split images (in order) into rows whose summed aspect ratios sit closest to the target. */
export function justify(ratios: number[], target = 3.2): number[] {
  const n = ratios.length;
  const best: [number, number[]][] = [[0, []], ...Array.from({ length: n }, () => [Infinity, []] as [number, number[]])];
  for (let j = 1; j <= n; j++) {
    for (let i = 0; i < j; i++) {
      const total = ratios.slice(i, j).reduce((s, r) => s + r, 0);
      const cost = best[i][0] + (total - target) ** 2;
      if (cost < best[j][0]) best[j] = [cost, [...best[i][1], j - i]];
    }
  }
  return best[n][1];
}

export type WorkImage = { alt: string; src: string; width: number; height: number; caption?: string };

/** Justified rows of images, as arrays with each image's flex ratio. */
export function workRows(imgs: WorkImage[], target = 3.2) {
  const sizes = justify(imgs.map((i) => i.width / i.height), target);
  const rows: (WorkImage & { ratio: number })[][] = [];
  let k = 0;
  for (const size of sizes) {
    rows.push(imgs.slice(k, k + size).map((i) => ({ ...i, ratio: i.width / i.height })));
    k += size;
  }
  return rows;
}

/** Every tagged portfolio image for a layer, across the worlds in order, captioned with the world. */
export async function workImages(layer: string) {
  const out: WorkImage[] = [];
  for (const w of await getWorlds()) {
    for (const img of w.data.work) {
      if (img.layer === layer) out.push({ ...img, caption: `${w.data.name.replace(' ', ' ')} ${w.data.em}` });
    }
  }
  return out;
}
