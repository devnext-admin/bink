// Bink design tokens — from the official Bink brand guidelines
// (carried over from the original client app's theme system).
// Bink Red #FF385C on white, Bink Black #222222, Poppins type,
// pill buttons, 20px cards, 12px inputs, star #FBBF24.

export const colors = {
  ink: '#222222', // Bink Black — primary text
  gray: '#545A62', // neutral 600 — subtitles
  grayLight: '#8A8D93', // neutral 500 — hints/placeholders
  body: '#374151', // neutral 700 — body text
  border: '#D1D4D9', // neutral 300
  divider: '#E5E7EB', // neutral 200
  bgSubtle: '#F1F5F9', // neutral 100
  bgPage: '#F9F9F9', // BG light
  white: '#FFFFFF',
  accent: '#FF385C', // Bink Red — CTA / interactive
  accentDark: '#E6323A', // red 600 — hover/pressed
  accentSoft: '#FFF5F7', // red 50 — ghost backgrounds
  accentLight: '#FFEBEF', // red 100
  star: '#FBBF24',
  green: '#10A660',
  greenBg: '#B6E8D1',
  warning: '#E18308',
  warningBg: '#FEF4E6',
  danger: '#E83550',
  dangerBg: '#FEECEB',
  info: '#194F8A',
  infoBg: '#EAF4FF',
  overlay: 'rgba(0, 0, 0, 0.4)',
  heroGradient: ['#FF9EBB', '#FFE2DB', '#FFB488'] as const,
  heroGradientSoft: ['#FFD9E3', '#FFF4F0', '#FFE3D4'] as const,
  pink: '#FF385C',
} as const;

export const radius = {
  sm: 8,
  md: 12, // inputs
  lg: 20, // cards
  xl: 24,
  pill: 999, // buttons & badges
} as const;

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
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
