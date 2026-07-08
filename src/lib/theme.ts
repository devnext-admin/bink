// Bink design tokens — extracted from Fresha's live design system.
// Text #0D0D0D on white, violet accent #6950F3, star yellow #FFC00A,
// pill buttons (999), cards 8/16, pastel violet hero gradient.

export const colors = {
  ink: '#0D0D0D',
  gray: '#767676',
  grayLight: '#A8A8A8',
  border: '#D3D3D3',
  divider: '#E9E9E9',
  bgSubtle: '#F2F2F2',
  bgPage: '#F7F7F7',
  white: '#FFFFFF',
  accent: '#6950F3',
  star: '#FFC00A',
  green: '#12873F',
  danger: '#D2222D',
  overlay: 'rgba(19, 19, 19, 0.33)',
  heroGradient: ['#DCCEFF', '#F6DFF3', '#E4DDFB'] as const,
  pink: '#FF3B8D',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

// Desktop web breakpoint: >= lg gets the desktop chrome (header/footer),
// below it everything renders the mobile experience.
export const breakpoints = { md: 768, lg: 1024 } as const;

export const maxContentWidth = 1200;
