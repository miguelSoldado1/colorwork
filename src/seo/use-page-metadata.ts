import { useEffect } from "react";

const SITE_URL = "https://www.playcolorwork.com";

interface PageMetadata {
  description: string;
  path: string;
  title: string;
}

export function usePageMetadata({ description, path, title }: PageMetadata) {
  useEffect(() => {
    const canonicalUrl = new URL(path, SITE_URL).toString();

    document.title = title;
    setMetaContent("name", "description", description);
    setMetaContent("property", "og:title", title);
    setMetaContent("property", "og:description", description);
    setMetaContent("property", "og:url", canonicalUrl);
    setMetaContent("name", "twitter:title", title);
    setMetaContent("name", "twitter:description", description);
    setCanonicalUrl(canonicalUrl);
  }, [description, path, title]);
}

function setMetaContent(attribute: "name" | "property", key: string, content: string) {
  const meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  meta?.setAttribute("content", content);
}

function setCanonicalUrl(url: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = url;
}
