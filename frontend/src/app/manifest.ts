import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vidhaan AI',
    short_name: 'Vidhaan',
    description: 'Indian Legal AI Assistant & Statutory Workspace',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d131a',
    theme_color: '#0f2942',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
