// Biz-Salama Design System & Constants

export const COLORS = {
  // Dark/Ink Tones
  ink: '#0a0a0f',
  ink2: '#141420',
  ink3: '#1e1e2d',
  
  // Surface/Light Tones
  surface: '#ffffff',
  surface2: '#f8f9fa',
  surface3: '#e9ecef',
  
  // Primary Accent - Gold
  gold: '#d4a03a',
  goldLight: '#e8c468',
  goldDark: '#b8860b',
  goldPale: 'rgba(212, 160, 58, 0.15)',
  
  // Success/Emerald
  emerald: '#10b981',
  emeraldLight: '#34d399',
  emeraldDark: '#059669',
  emeraldPale: 'rgba(16, 185, 129, 0.15)',
  
  // Error/Ruby
  ruby: '#ef4444',
  rubyLight: '#f87171',
  rubyDark: '#dc2626',
  rubyPale: 'rgba(239, 68, 68, 0.15)',
  
  // Warning/Amber
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  amberDark: '#d97706',
  
  // Info/Blue
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueDark: '#2563eb',
  
  // Gateway Colors
  selcom: '#e63946',
  mpesa: '#4bb543',
  airtel: '#ff3d00',
  nala: '#7c3aed',
  stripe: '#635bff',
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  textDark: '#0a0a0f',
  textGray: '#6b7280',
};

export const GATEWAY_CONFIG = {
  selcom: {
    id: 'selcom',
    label: 'Selcom Pesalink',
    sublabel: 'Benki zote Tanzania · All TZ Banks + Selcom Wallet',
    fee_pct: 0.005,
    fee_min_tzs: 200,
    fee_max_tzs: 10000,
    currency: 'TZS',
    color: '#e63946',
    bgGrad: ['#b71c1c', '#e63946'],
    settlement: 'Papo hapo · Instant',
    supportedTypes: ['selcom_wallet', 'bank_transfer', 'ussd'],
    icon: 'wallet',
    badge: 'LOWEST FEES',
  },
  mpesa: {
    id: 'mpesa',
    label: 'M-Pesa',
    sublabel: 'Vodacom · Haraka · Tanzania\'s #1',
    fee_pct: 0.01,
    fee_min_tzs: 500,
    fee_max_tzs: 15000,
    currency: 'TZS',
    color: '#4bb543',
    bgGrad: ['#2d8a28', '#4bb543'],
    settlement: 'Papo hapo · Instant',
    icon: 'phone-portrait',
    badge: 'POPULAR',
  },
  airtel: {
    id: 'airtel',
    label: 'Airtel Money',
    sublabel: 'Airtel Tanzania · Fast & Reliable',
    fee_pct: 0.01,
    fee_min_tzs: 500,
    fee_max_tzs: 15000,
    currency: 'TZS',
    color: '#ff3d00',
    bgGrad: ['#c62828', '#ff3d00'],
    settlement: 'Papo hapo · Instant',
    icon: 'phone-portrait',
  },
  nala: {
    id: 'nala',
    label: 'NALA',
    sublabel: 'Diaspora · UK · US · EU → TZS Instantly',
    fee_pct: 0,
    fee_min_tzs: 0,
    fee_max_tzs: 0,
    currency: 'USD',
    color: '#7c3aed',
    bgGrad: ['#4c1d95', '#7c3aed'],
    settlement: 'Dakika 0–10 · 0–10 minutes',
    supportedCountries: ['GB', 'US', 'EU', 'CA', 'AU'],
    icon: 'globe',
    badge: 'DIASPORA',
  },
  stripe: {
    id: 'stripe',
    label: 'Kadi ya Kimataifa',
    sublabel: 'Visa · Mastercard · Apple Pay · Google Pay',
    fee_pct: 0.029,
    fee_fixed_usd: 0.30,
    currency: 'USD',
    color: '#635bff',
    bgGrad: ['#3730a3', '#635bff'],
    settlement: 'Siku 2–3 · 2–3 business days',
    icon: 'card',
    badge: 'INTERNATIONAL',
  },
};

export const FX_RATE = 2580; // USD to TZS

export const calcGatewayFee = (gatewayId: string, amountTzs: number): number => {
  const gw = GATEWAY_CONFIG[gatewayId as keyof typeof GATEWAY_CONFIG];
  if (!gw) return 0;
  
  if (gatewayId === 'nala') return 0; // Fee on sender side
  
  if (gatewayId === 'stripe') {
    const amountUsd = amountTzs / FX_RATE;
    const fee = amountUsd * gw.fee_pct + (gw.fee_fixed_usd || 0);
    return Math.round(fee * FX_RATE);
  }
  
  let fee = amountTzs * gw.fee_pct;
  fee = Math.max(fee, gw.fee_min_tzs || 0);
  fee = Math.min(fee, gw.fee_max_tzs || fee);
  return Math.round(fee);
};

export const formatTZS = (amount: number): string => {
  return `TZS ${amount.toLocaleString()}`;
};

export const formatUSD = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const ESCROW_FEE_PCT = 0.02; // 2% escrow protection fee
export const SHIPPING_FEE_TZS = 5000;
