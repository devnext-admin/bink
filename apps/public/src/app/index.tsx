import React from 'react';
import { useIsDesktop } from '@bink/shared/lib/use-layout';
import { HomeDesktop } from '../screens/home-desktop';
import { HomeMobile } from '../screens/home-mobile';

export default function Home() {
  return useIsDesktop() ? <HomeDesktop /> : <HomeMobile />;
}
