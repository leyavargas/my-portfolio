// /favicon.ico en la raíz (algunos navegadores y buscadores lo piden directamente):
// entrega el favicon del sitio que se está construyendo.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentSiteId } from '../data/sites';

export async function GET() {
  // Ruta desde la raíz del proyecto (el build se ejecuta ahí, también en Vercel).
  const icon = await readFile(join(process.cwd(), 'public', 'favicons', currentSiteId, 'favicon.ico'));
  return new Response(icon, { headers: { 'Content-Type': 'image/x-icon' } });
}
