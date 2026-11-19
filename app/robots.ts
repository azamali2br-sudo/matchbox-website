import type { MetadataRoute } from 'next'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.matchboxpadel.com').trim().replace(/\/+$/, '')

// Keep private / per-person pages out of search: admin, the logged-in account,
// booking manage links and Americano organizer links (those carry secret tokens),
// and the API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/api/', '/booking/manage/', '/americano/*/manage/', '/login'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
