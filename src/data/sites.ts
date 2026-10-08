// Configuración por sitio. El mismo código construye dos sitios (UX y Brand);
// la variable de entorno PUBLIC_SITE ("ux" o "brand") decide cuál se usa.
// Todo lo demás (estilos, componentes, diseño) es compartido.

export const SITE_IDS = ['ux', 'brand'] as const;
export type SiteId = (typeof SITE_IDS)[number];

type Link = { label: string; href: string };

interface SiteConfig {
  /** Dirección pública del sitio (para links absolutos y la vista previa al compartir). */
  url: string;
  /** Rol en el título de la pestaña: "Leyla Vargas — <role>". */
  role: string;
  /** Descripción para Google y la vista previa al compartir. */
  description: string;
  /** Titular del hero del inicio. Cada elemento es una línea en pantallas anchas. */
  heroTitle: string[];
  /** Tira de disciplinas sobre el titular del hero. */
  disciplines: string[];
  /** Escala del tamaño del titular del hero (1 = tamaño normal). Para frases más largas. */
  heroTitleScale?: number;
  about: {
    title: string;
    paragraphs: string[];
    /** Texto provisional: se muestra con una marca visible de "pendiente". */
    pending?: boolean;
  };
  /** Links del footer además de Home y LinkedIn (comunes a ambos sitios). */
  footerLinks: Link[];
}

export const sites: Record<SiteId, SiteConfig> = {
  ux: {
    url: 'https://www.leylavargas.com',
    role: 'UX/UI Designer',
    description: 'UX/UI design portfolio: research, design systems and human-centered interfaces.',
    heroTitle: ['Product designer with a', 'background in brand identity'],
    disciplines: ['Product Design', 'UX/UI', 'Visual Systems'],
    about: {
      title: 'Hello, hello!',
      paragraphs: [
        'I’m Leyla, senior designer with 10 years of experience in brand and visual design, now focused on digital product.',
        'Around 2020, at DiDi, I started applying product thinking to brand work. As Senior Digital Designer, I led two interconnected design systems across eight Latin American markets, using methods like user surveys, heuristic evaluation, and iterative testing.',
        'I’m drawn to complex problems that need both systematic thinking and clear visual direction, and I believe good design makes complexity easier to navigate.',
      ],
    },
    footerLinks: [],
  },
  brand: {
    url: 'https://www.leylavargas.net',
    role: 'Senior Designer',
    description:
      'Senior designer turning complex ideas into visual systems. Designer first, illustrator by training.',
    heroTitle: [
      'Senior designer turning complex ideas into visual systems. Designer first, illustrator by training.',
    ],
    disciplines: ['Art Direction', 'Illustration', 'Visual Systems'],
    // 85% del tamaño normal: la frase queda en 3 líneas en laptops y monitores.
    heroTitleScale: 0.85,
    about: {
      title: 'Hello, hello!',
      paragraphs: [
        'I’m Leyla, a senior designer who turns complex ideas into a single image or a complete visual system. With more than ten years of experience, I work between brand strategy and graphic design, taking projects from concept to execution across markets, channels, and contexts. I’m drawn to problems where visual design, systems thinking, and product meet.',
        'I consider myself a designer first. Illustration has been part of my work from the beginning, first as a practical tool born out of necessity, and later as a deeper practice, formalized with a postgraduate degree from EINA in Barcelona. For me, illustration isn’t decoration, but a way of solving problems that other tools can’t.',
      ],
    },
    footerLinks: [
      { label: 'Behance', href: 'https://www.behance.net/leyvsz8659' },
      { label: 'Instagram', href: 'https://www.instagram.com/meteorita_' },
    ],
  },
};

// Si PUBLIC_SITE no está definida, o está vacía, se construye el sitio UX por defecto.
const DEFAULT_SITE: SiteId = 'ux';
const raw = (import.meta.env.PUBLIC_SITE ?? '').trim().toLowerCase() || DEFAULT_SITE;
if (!(SITE_IDS as readonly string[]).includes(raw)) {
  throw new Error(`PUBLIC_SITE="${raw}" no es válido. Usa uno de: ${SITE_IDS.join(', ')}.`);
}

/** Sitio que se está construyendo. */
export const currentSiteId = raw as SiteId;
export const currentSite = sites[currentSiteId];
