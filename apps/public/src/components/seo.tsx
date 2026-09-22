import Head from 'expo-router/head';
import React from 'react';
import { Platform } from 'react-native';

/**
 * Per-route page metadata for web. On native this renders nothing.
 * Layers a specific <title>/<meta description>/OG title over the defaults in
 * +html.tsx so each page (and shared link) gets its own title and preview.
 */
export function Seo({ title, description }: { title: string; description?: string }) {
  // expo-router's Head also drives native handoff and alerts when it is not
  // fully configured, so keep it strictly to the web bundle.
  if (Platform.OS !== 'web') return null;
  const full = title.includes('Bink') ? title : `${title} · Bink`;
  return (
    <Head>
      <title>{full}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta property="og:title" content={full} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta name="twitter:title" content={full} />
    </Head>
  );
}
