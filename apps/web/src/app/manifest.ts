import type { MetadataRoute } from 'next';
import { appName } from '@/lib/env';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: 'Momo',
    description: 'Himalayan street dumplings · South Auckland',
    start_url: '/',
    display: 'standalone',
    background_color: '#1F2A44',
    theme_color: '#1F2A44',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
