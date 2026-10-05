import { getCollection, type CollectionEntry } from 'astro:content';

// Último año de un valor como 2024 o "2020-2022", para ordenar.
const lastYear = (year: number | string) => Math.max(...(String(year).match(/\d{4}/g) ?? ['0']).map(Number));

/** Proyectos publicados, ordenados por `order` y luego del más reciente al más antiguo. */
export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  return (await getCollection('projects', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order || lastYear(b.data.year) - lastYear(a.data.year),
  );
}
