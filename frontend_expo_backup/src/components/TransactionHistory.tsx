import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, formatTZS, formatTZSShort } from '../constants/theme';

// Mock data - in production, fetch from API
const MOCK_HISTORY = [
  { id: 'SCT-AB12X', item: 'Samsung Galaxy S24 Ultra', amount: 1850000, status: 'released', date: '2025-04-08', method: 'mpesa', seller: 'Amani Tech DSM', rating: 5 },
  { id: 'SCT-CD34Y', item: 'Nike Air Jordan 1 Retro High', amount: 380000, status: 'in_escrow', date: '2025-04-10', method: 'selcom', seller: 'SneakerKing TZ', rating: null },
  { id: 'SCT-EF56Z', item: 'Canon EOS R6 Camera', amount: 3200000, status: 'disputed', date: '2025-04-05', method: 'nala', seller: 'PhotoTech Tanzania', rating: null },
  { id: 'SCT-GH78W', item: 'Vintage Levi\'s Jacket', amount: 145000, status: 'released', date: '2025-03-28', method: 'airtel', seller: 'VintageVibes DSM', rating: 4 },
  { id: 'SCT-IJ90V', item: 'MacBook Air M3', amount: 5800000, status: 'released', date: '2025-03-15', method: 'stripe', seller: 'TechHub Arusha', rating: 5 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  released: { label: 'Imetolewa / Released', color: '#1A7A5A', bg: '#E8F5F0', icon: '✅' },
  in_escrow: { label: 'Imeshikwa / In Escrow', color: '#D4850A', bg: '#FEF8EC', icon: '🔒' },
  disputed: { label: 'Tatizo / Disputed', color: '#C0392B', bg: '#FDF0EF', icon: '⚠️' },
  refunded: { label: 'Imerudishwa / Refunded', color: '#1A4A8A', bg: '#EEF3FC', icon: '↩' },
};

const METHOD_ICONS: Record<string, string> = { mpesa: '📲', selcom: '🏦', airtel: '📡', nala: '🌍', stripe: '💳' };

interface TransactionHistoryProps {
  onClose: () => void;
}

export function TransactionHistory({ onClose }: TransactionHistoryProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const filtered = MOCK_HISTORY.filter((tx) => {
    const matchSearch =
      tx.item.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.seller.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || tx.status === filter;
    return matchSearch && matchFilter;
  });

  const totalSpent = MOCK_HISTORY.filter((t) => t.status === 'released').reduce((s, t) => s + t.amount, 0);

  if (selected) {
    return <TransactionDetail tx={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Historia ya Miamala</Text>
            <Text style={styles.headerSub}>Transaction History</Text>
          </View>
        </View>
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            ['Miamala', MOCK_HISTORY.length.toString()],
            ['Ziliotolewa', MOCK_HISTORY.filter((t) => t.status === 'released').length.toString()],
            ['Jumla', formatTZSShort(totalSpent)],
          ].map(([label, value]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tafuta muamala… / Search…"
          placeholderTextColor="rgba(10,10,15,0.4)"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            ['all', 'Zote'],
            ['released', 'Ziliotolewa'],
            ['in_escrow', 'Escrow'],
            ['disputed', 'Tatizo'],
          ].map(([val, lbl]) => (
            <TouchableOpacity
              key={val}
              style={[styles.filterChip, filter === val && styles.filterChipActive]}
              onPress={() => setFilter(val)}
            >
              <Text style={[styles.filterText, filter === val && styles.filterTextActive]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView style={styles.listContainer}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Hakuna matokeo / No results</Text>
          </View>
        ) : (
          filtered.map((tx) => {
            const st = STATUS_CONFIG[tx.status];
            return (
              <TouchableOpacity key={tx.id} style={styles.txCard} onPress={() => setSelected(tx)}>
                <View style={[styles.txIcon, { backgroundColor: st.bg }]}>
                  <Text style={styles.txIconText}>{st.icon}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txItem} numberOfLines={1}>
                    {tx.item}
                  </Text>
                  <Text style={styles.txMeta}>
                    {tx.seller} · {METHOD_ICONS[tx.method]} · {tx.date}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>{formatTZSShort(tx.amount)}</Text>
                  <Text style={[styles.txStatus, { color: st.color }]}>{st.label.split('/')[0].trim()}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionDetail({ tx, onBack }: { tx: any; onBack: () => void }) {
  const st = STATUS_CONFIG[tx.status];

  const shareReceipt = async () => {
    const text = `SecureTrade Receipt\nTX: ${tx.id}\nItem: ${tx.item}\nAmount: ${formatTZS(tx.amount)}\nSeller: ${tx.seller}\nDate: ${tx.date}\nStatus: ${tx.status}\nVerify: securetrade.co.tz/verify/${tx.id}`;
    await Share.share({ message: text, title: 'SecureTrade Receipt' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Maelezo / Details</Text>
        </View>
      </View>

      <ScrollView style={styles.detailContent}>
        <View style={styles.detailCard}>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusBadgeText, { color: st.color }]}>
              {st.icon} {st.label}
            </Text>
          </View>

          <Text style={styles.detailTitle}>{tx.item}</Text>
          <Text style={styles.detailSeller}>Muuzaji: {tx.seller}</Text>

          {[
            ['Nambari / TX ID', tx.id],
            ['Kiasi / Amount', formatTZS(tx.amount)],
            ['Tarehe / Date', tx.date],
            ['Njia / Method', `${METHOD_ICONS[tx.method]} ${tx.method.charAt(0).toUpperCase() + tx.method.slice(1)}`],
            ['Hali / Status', st.label],
          ].map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        {tx.rating && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingLabel}>Ukadiriaji wako / Your rating</Text>
            <Text style={styles.ratingStars}>{'⭐'.repeat(tx.rating)}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.shareBtn} onPress={shareReceipt}>
          <Text style={styles.shareBtnText}>📋 Shiriki Risiti / Share Receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.ink,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: 18,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
  },
  statValue: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 2,
  },
  searchSection: {
    padding: 12,
    paddingBottom: 0,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
  },
  filterRow: {
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.ink,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(10,10,15,0.35)',
    fontSize: 14,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 13,
    marginBottom: 10,
    gap: 12,
    ...SHADOWS.sm,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txItem: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  txMeta: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.45)',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  txStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  detailSeller: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  detailLabel: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  ratingLabel: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.4)',
    marginBottom: 8,
  },
  ratingStars: {
    fontSize: 28,
  },
  shareBtn: {
    backgroundColor: COLORS.ink,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 14,
  },
  shareBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
