import { useEffect } from 'react';

interface Props {
  title: string;
  description?: string;
}

export function PageSeo({ title, description }: Props) {
  useEffect(() => {
    const siteName = 'Tunga';
    document.title = title.includes(siteName) ? title : `${title} — ${siteName}`;
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
