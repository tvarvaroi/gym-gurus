import { useEffect } from 'react';

interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}

/**
 * Sets document title and meta tags for SEO.
 * For SPAs, this updates <head> tags dynamically on route change.
 */
export function useSEO({ title, description, canonical, type = 'website', jsonLd }: SEOConfig) {
  useEffect(() => {
    const fullTitle = title.includes('GymGurus') ? title : `${title} | GymGurus`;
    document.title = fullTitle;

    setMeta('description', description);
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', type, 'property');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);

    if (canonical) {
      setMeta('og:url', canonical, 'property');
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // JSON-LD structured data
    if (jsonLd) {
      let script = document.querySelector<HTMLScriptElement>('script[data-seo-jsonld]');
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', 'true');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);

      return () => {
        script?.remove();
      };
    }
  }, [title, description, canonical, type, jsonLd]);
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}
