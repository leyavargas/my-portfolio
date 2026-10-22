import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SITE_IDS } from './data/sites';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Sitios donde aparece el proyecto (un solo archivo para todos).
      sites: z.array(z.enum(SITE_IDS)).min(1),
      summary: z.string(),
      // Texto corto para la tarjeta del inicio; si falta, se usa `summary`.
      excerpt: z.string().optional(),
      client: z.string().optional(),
      collaboration: z.string().optional(),
      role: z.string(),
      // Un año (2024) o un rango ("2020-2022").
      year: z.union([z.number(), z.string()]),
      duration: z.string().optional(),
      tools: z.array(z.string()).default([]),
      // Resultados clave que se muestran en la sección Impact del overview.
      impact: z.array(z.string()).default([]),
      cover: image().optional(),
      // Versión vertical opcional del hero para pantallas verticales (celular).
      coverMobile: image().optional(),
      // Video opcional para el hero (ruta dentro de /public, p. ej. "/videos/x.mp4").
      // Se reproduce solo, en loop y sin sonido; `cover` se usa como portada mientras carga.
      coverVideo: z.string().optional(),
      // Versión vertical del video del hero para celular (usa `coverMobile` como portada).
      coverVideoMobile: z.string().optional(),
      accent: z.string().default('#e8e4dc'),
      featured: z.boolean().default(false),
      order: z.number().default(99),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects };
