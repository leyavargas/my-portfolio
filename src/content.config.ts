import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      client: z.string().optional(),
      role: z.string(),
      year: z.number(),
      duration: z.string().optional(),
      tools: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      accent: z.string().default('#e8e4dc'),
      featured: z.boolean().default(false),
      order: z.number().default(99),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects };
