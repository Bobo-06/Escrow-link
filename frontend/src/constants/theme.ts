// SecureTrade TZ Design System
// Premium Fintech PWA Theme

export const COLORS = {
  // Primary Ink (Dark backgrounds)
  ink: '#0a0a0f',
  ink2: '#1a1a26',
  ink3: '#2a2a3a',
  
  // Surfaces (Light backgrounds)
  surface: '#f4f3ef',
  surface2: '#eceae3',
  surface3: '#e2ded5',
  
  // Gold Accent (Trust & Premium)
  gold: '#c8a96e',
  goldLight: '#e8d4a8',
  goldDark: '#9a7a42',
  
  // Emerald (Success & Security)
  emerald: '#1a7a5a',
  emeraldLight: '#22a878',
  emeraldPale: '#e8f5f0',
  
  // Ruby (Errors & Disputes)
  ruby: '#c0392b',
  rubyPale: '#fdf0ef',
  
  // Amber (Warnings)
  amber: '#d4850a',
  amberPale: '#fef8ec',
  
  // M-Pesa Green
  mpesa: '#4bb543',
  mpesaDark: '#2d8a28',
  
  // Blue (Info)
  blue: '#1a4a8a',
  bluePale: '#eef3fc',
  
  // White
  white: '#ffffff',
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0a0a0f',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0a0a0f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0a0a0f',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
  },
  gold: {
    shadowColor: '#c8a96e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  mpesa: {
    shadowColor: '#4bb543',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const FONTS = {
  heading: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
  headingBold: {
    fontFamily: 'System',
    fontWeight: '800' as const,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontWeight: '500' as const,
  },
  bodySemibold: {
    fontFamily: 'System',
    fontWeight: '600' as const,
  },
};

// Step labels for buyer flow
export const STEPS = ['Bidhaa', 'Malipo', 'Escrow', '✓', 'Track', 'Toa'];

// Format currency
export const formatTZS = (amount: number): string => {
  return `TZS ${amount.toLocaleString('en-TZ')}`;
};

export const formatTZSShort = (amount: number): string => {
  if (amount >= 1000000) {
    return `TZS ${(amount / 1000000).toFixed(1)}M`;
  }
  return `TZS ${(amount / 1000).toFixed(0)}K`;
};

// Payment methods
export const PAYMENT_METHODS = [
  { id: 'mpesa', icon: '📲', name: 'M-Pesa', detail: 'Haraka · Fast — Tanzania #1', color: COLORS.mpesa },
  { id: 'airtel', icon: '💳', name: 'Airtel Money', detail: 'Airtel Tanzania', color: '#e40000' },
  { id: 'tigo', icon: '📱', name: 'Tigo Pesa', detail: 'Tigo Tanzania', color: '#004a98' },
  { id: 'nala', icon: '🌍', name: 'NALA', detail: 'Diaspora Payments (USD/GBP/EUR)', color: COLORS.gold },
];

// Tracking statuses
export const TRACKING_STATUSES = [
  { status: 'done', icon: '✓', title: 'Muamala Umethibitishwa', en: 'Order Confirmed' },
  { status: 'done', icon: '✓', title: 'Bidhaa Imepelekwa Sendy', en: 'Dispatched via Sendy' },
  { status: 'active', icon: '📦', title: 'Inasafirishwa', en: 'In Transit' },
  { status: 'pending', icon: '🚚', title: 'Imefika Jijini', en: 'Arrived in City' },
  { status: 'pending', icon: '🏠', title: 'Imewasilishwa', en: 'Delivered' },
];
