import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

interface Seller {
  name: string;
  handle?: string;
  avatar?: string;
  trustScore?: number;
  trades?: number;
  rating?: number;
  memberDays?: number;
}

interface SellerTrustCardProps {
  seller: Seller;
}

export const SellerTrustCard: React.FC<SellerTrustCardProps> = ({ seller }) => {
  const score = seller.trustScore || 87;
  const color = score >= 80 ? COLORS.emerald : score >= 60 ? COLORS.amber : COLORS.ruby;
  const label = score >= 80 ? 'Muuzaji Mwaminifu · Trusted' : score >= 60 ? 'Imethibitishwa · Verified' : 'Mpya · New';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{seller.avatar || '👤'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{seller.name}</Text>
          {seller.handle && <Text style={styles.handle}>{seller.handle}</Text>}
        </View>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color }]}>{score}</Text>
          <Text style={styles.scoreLabel}>TRUST</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>

      <Text style={[styles.label, { color }]}>{label}</Text>

      <View style={styles.stats}>
        {[
          ['✓', `${seller.trades || 0}`, 'Trades'],
          ['⭐', `${seller.rating || 'N/A'}`, 'Rating'],
          ['📅', `${seller.memberDays || 0}d`, 'Member'],
        ].map(([icon, value, label], i) => (
          <View key={i} style={styles.statItem}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  handle: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  score: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.surface3,
    paddingTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(10,10,15,0.4)',
    marginTop: 2,
  },
});
