import { useEffect } from 'react';

interface Props {
  title: string;
  description?: string;
}

const FAVICON_HREF = '/assets/aistudio/ituze-favicon-1_10b6b826.svg?v=3';

export function PageSeo({ title, description }: Props) {
  useEffect(() => {
    const siteName = 'ITUZE';
    const hasBrand = title.toLowerCase().includes('ituze');
    document.title = hasBrand ? title : `${title} · ${siteName}`;

    // Ensure browser tab favicon stays synced to the upgraded Ituze SVG emblem
    const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
    rels.forEach((rel) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      if (rel !== 'apple-touch-icon') {
        link.type = 'image/svg+xml';
      }
      if (link.getAttribute('href') !== FAVICON_HREF) {
        link.setAttribute('href', FAVICON_HREF);
      }
    });

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);

  return null;
}
