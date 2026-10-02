// The content system: one file per world, layer, category page and Rules article.
// Add a world by adding src/content/worlds/<slug>.json; every page that lists worlds picks it up.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const LAYER = z.enum(['Lore', 'Law', 'Language', 'Map', 'Ground', 'Artifacts', 'Machinery']);

const worlds = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/worlds' }),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    em: z.string(),
    cat: z.string(),
    cats: z.array(z.string()),
    line: z.string(),
    about: z.array(z.string()),
    where: z.string().nullable(),
    url: z.string().nullable(),
    impact: z.string().nullable().optional(),
    plate: z.string(),
    film: z.string(),
    alt: z.string(),
    // What KNGHT built on each layer. Only verified work.
    built: z.record(z.string(), z.string()),
    // Portfolio images, in order, with the layer each one shows (null: not on layer pages).
    work: z.array(z.object({ alt: z.string(), src: z.string(), width: z.number(), height: z.number(), layer: LAYER.nullable() })),
  }),
});

const layers = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/layers' }),
  schema: z.object({
    order: z.number(),
    name: LAYER,
    line: z.string(),
    question: z.string(),
    what: z.string(),
    wrong: z.string(),
    make: z.array(z.string()),
    check: z.array(z.string()),
    reads: z.string().nullable(),
    feeds: z.string(),
    quiz: z.string(),
    tags: z.array(z.string()),
  }),
});

const forPages = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/for' }),
  schema: z.object({
    order: z.number(),
    meta: z.string(),
    cat: z.string(),
    noun: z.string(),
    title: z.string(),
    answer: z.string(),
    worlds: z.array(z.string()),
  }),
});

const rules = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/rules' }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    cat: z.string(),
    dek: z.string(),
    eyebrow: z.string().optional(),
    layer: LAYER.nullable(),
    for: z.string().nullable(),
    sources: z.array(z.object({ title: z.string(), url: z.string() })),
  }),
});

export const collections = { worlds, layers, forPages, rules };
