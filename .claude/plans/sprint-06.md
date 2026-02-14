# Sprint 6: SEO & Discoverability

**Status:** COMPLETED
**Estimated Time:** 3–4 hours
**Skills Used:** seo-audit, programmatic-seo, free-tool-strategy, content-strategy

## Tasks

- [x] **Task 6.1** — Technical SEO Audit
  - Meta tags, title tags, canonical URLs in index.html
  - robots.txt created with proper allow/disallow rules
  - sitemap.xml created with all 16 public URLs
  - Core Web Vitals addressed via existing performance optimizations

- [x] **Task 6.2** — Structured Data (JSON-LD)
  - SoftwareApplication schema.org markup in index.html
  - WebApplication JSON-LD on all 13 calculator pages via useSEO() hook
  - Dynamic structured data injection per page

- [x] **Task 6.3** — Programmatic SEO Pages
  - /calculators hub page already existed with full SEO
  - Each calculator as standalone SEO landing page with useSEO()
  - Cross-linking via RelatedCalculators component on all 12 calculator pages

- [x] **Task 6.4** — Keyword Research
  - Keywords mapped to pages via meta tags and useSEO() descriptions
  - Calculator pages target long-tail fitness keywords

- [x] **Task 6.5** — Analytics Setup
  - Google Analytics gtag.js integration via VITE_GA_MEASUREMENT_ID env var
  - initAnalytics() called on app startup
  - trackPageView() on every route change
  - trackEvent() helper for custom events

- [x] **Task 6.6** — Social Sharing
  - Open Graph tags for all pages in index.html
  - Twitter Card meta tags (large image summary)
  - Dynamic OG tag updates via useSEO() hook
