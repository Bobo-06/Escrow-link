import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZS } from '../constants/theme';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

type TabType = 'create' | 'pending' | 'transactions';
type TransactionStatus = 'pending_approval' | 'approved' | 'paid' | 'completed' | 'rejected';

interface ThreePartyTransaction {
  tx_id: string;
  status: TransactionStatus;
  escrow_status: string;
  item_name: string;
  item_description?: string;
  quantity: number;
  buyer_price: number;
  supplier_cost?: number;
  commission?: number;
  platform_fee?: number;
  hawker_name: string;
  supplier_name: string;
  supplier_phone: string;
  buyer_name?: string;
  created_at: string;
  my_role?: 'hawker' | 'supplier' | 'buyer';
}

interface Props {
  onClose: () => void;
}

export const ThreePartyEscrow: React.FC<Props> = ({ onClose }) => {
  const { sessionToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create form
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [buyerPrice, setBuyerPrice] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  // Pending approvals (for suppliers)
  const [pendingRequests, setPendingRequests] = useState<ThreePartyTransaction[]>([]);
  
  // My transactions
  const [transactions, setTransactions] = useState<ThreePartyTransaction[]>([]);
  
  // Approve modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<ThreePartyTransaction | null>(null);
  const [supplierCost, setSupplierCost] = useState('');
  
  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ sw: '', en: '' });

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingRequests();
    } else if (activeTab === 'transactions') {
      fetchMyTransactions();
    }
  }, [activeTab]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/escrow/three-party/pending`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.pending || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/escrow/three-party/my-transactions`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'pending') {
      await fetchPendingRequests();
    } else if (activeTab === 'transactions') {
      await fetchMyTransactions();
    }
    setRefreshing(false);
  };

  const handleCreateRequest = async () => {
    if (!itemName || !buyerPrice || !supplierPhone) {
      alert('Tafadhali jaza taarifa zote / Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/escrow/three-party/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          item_name: itemName,
          item_description: itemDescription,
          buyer_price: parseFloat(buyerPrice),
          supplier_phone: supplierPhone,
          quantity: parseInt(quantity) || 1,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSuccessMessage({ sw: data.message_sw, en: data.message_en });
        setShowSuccess(true);
        // Reset form
        setItemName('');
        setItemDescription('');
        setBuyerPrice('');
        setSupplierPhone('');
        setQuantity('1');
      } else {
        alert(data.detail || 'Error creating request');
      }
    } catch (err) {
      console.error('Create error:', err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTx || !supplierCost) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/escrow/three-party/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          tx_id: selectedTx.tx_id,
          supplier_cost: parseFloat(supplierCost),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setShowApproveModal(false);
        setSupplierCost('');
        setSelectedTx(null);
        setSuccessMessage({ sw: data.message_sw, en: data.message_en });
        setShowSuccess(true);
        fetchPendingRequests();
      } else {
        alert(data.detail || 'Error approving');
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (txId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/escrow/three-party/reject?tx_id=${txId}&reason=Not available`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.ok) {
        fetchPendingRequests();
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const badges: Record<TransactionStatus, { color: string; label: string; labelEn: string }> = {
      pending_approval: { color: COLORS.amber, label: 'Inasubiri', labelEn: 'Pending' },
      approved: { color: COLORS.blue, label: 'Imekubaliwa', labelEn: 'Approved' },
      paid: { color: COLORS.emerald, label: 'Imelipwa', labelEn: 'Paid' },
      completed: { color: COLORS.gold, label: 'Imekamilika', labelEn: 'Completed' },
      rejected: { color: COLORS.ruby, label: 'Imekataliwa', labelEn: 'Rejected' },
    };
    return badges[status] || badges.pending_approval;
  };

  const getRoleBadge = (role?: string) => {
    const roles: Record<string, { icon: string; label: string; color: string }> = {
      hawker: { icon: '🛒', label: 'Mchuuzi', color: COLORS.gold },
      supplier: { icon: '🏪', label: 'Msambazaji', color: COLORS.blue },
      buyer: { icon: '🛍️', label: 'Mnunuzi', color: COLORS.emerald },
    };
    return roles[role || 'hawker'];
  };

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'create' && styles.tabActive]}
        onPress={() => setActiveTab('create')}
        data-testid="tab-create"
      >
        <Ionicons 
          name="add-circle" 
          size={18} 
          color={activeTab === 'create' ? COLORS.gold : COLORS.ink3} 
        />
        <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
          Omba Bidhaa
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
        onPress={() => setActiveTab('pending')}
        data-testid="tab-pending"
      >
        <Ionicons 
          name="time" 
          size={18} 
          color={activeTab === 'pending' ? COLORS.gold : COLORS.ink3} 
        />
        <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
          Maombi
        </Text>
        {pendingRequests.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
        onPress={() => setActiveTab('transactions')}
        data-testid="tab-transactions"
      >
        <Ionicons 
          name="list" 
          size={18} 
          color={activeTab === 'transactions' ? COLORS.gold : COLORS.ink3} 
        />
        <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
          Historia
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreateForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoIcon}>🤝</Text>
          <Text style={styles.infoTitle}>Escrow ya Pande Tatu</Text>
        </View>
        <Text style={styles.infoText}>
          Mchuuzi → Msambazaji → Mnunuzi
        </Text>
        <Text style={styles.infoSubtext}>
          Pesa inashikwa salama hadi bidhaa iwasilishwe. Kila mtu analipwa mwishoni.
        </Text>
      </View>

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.inputLabel}>Jina la Bidhaa *</Text>
        <TextInput
          style={styles.input}
          value={itemName}
          onChangeText={setItemName}
          placeholder="Mfano: Kanga 10, Viatu vya ngozi..."
          placeholderTextColor={COLORS.ink3}
          data-testid="input-item-name"
        />

        <Text style={styles.inputLabel}>Maelezo (Hiari)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={itemDescription}
          onChangeText={setItemDescription}
          placeholder="Maelezo zaidi kuhusu bidhaa..."
          placeholderTextColor={COLORS.ink3}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.inputLabel}>Idadi</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          placeholderTextColor={COLORS.ink3}
          keyboardType="number-pad"
        />

        <Text style={styles.inputLabel}>Bei ya Mnunuzi (TZS) *</Text>
        <TextInput
          style={styles.input}
          value={buyerPrice}
          onChangeText={setBuyerPrice}
          placeholder="Bei unayouza kwa mteja"
          placeholderTextColor={COLORS.ink3}
          keyboardType="number-pad"
          data-testid="input-buyer-price"
        />

        <Text style={styles.inputLabel}>Nambari ya Msambazaji *</Text>
        <TextInput
          style={styles.input}
          value={supplierPhone}
          onChangeText={setSupplierPhone}
          placeholder="0712345678"
          placeholderTextColor={COLORS.ink3}
          keyboardType="phone-pad"
          data-testid="input-supplier-phone"
        />

        {buyerPrice && (
          <View style={styles.feePreview}>
            <Text style={styles.feeTitle}>Makato ya Jukwaa (2.5%)</Text>
            <Text style={styles.feeAmount}>
              TZS {(parseFloat(buyerPrice) * 0.025).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleCreateRequest}
        disabled={loading}
        activeOpacity={0.85}
        data-testid="btn-create-request"
      >
        <LinearGradient
          colors={[COLORS.gold, COLORS.goldDark]}
          style={styles.submitBtnGradient}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.ink} />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color={COLORS.ink} />
              <Text style={styles.submitBtnText}>Tuma Ombi</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPendingList = () => (
    <ScrollView
      style={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {loading && pendingRequests.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.gold} style={{ marginTop: 40 }} />
      ) : pendingRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Hakuna Maombi Mapya</Text>
          <Text style={styles.emptySubtitle}>No pending requests</Text>
        </View>
      ) : (
        pendingRequests.map((tx) => (
          <View key={tx.tx_id} style={styles.txCard}>
            <View style={styles.txHeader}>
              <View>
                <Text style={styles.txItem}>{tx.item_name}</Text>
                <Text style={styles.txMeta}>Kutoka: {tx.hawker_name}</Text>
              </View>
              <Text style={styles.txPrice}>{formatTZS(tx.buyer_price)}</Text>
            </View>

            <View style={styles.txDetails}>
              <View style={styles.txDetailRow}>
                <Text style={styles.txDetailLabel}>Idadi:</Text>
                <Text style={styles.txDetailValue}>{tx.quantity}</Text>
              </View>
              <View style={styles.txDetailRow}>
                <Text style={styles.txDetailLabel}>Bei ya Mteja:</Text>
                <Text style={styles.txDetailValue}>{formatTZS(tx.buyer_price)}</Text>
              </View>
            </View>

            <View style={styles.txActions}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(tx.tx_id)}
                data-testid={`btn-reject-${tx.tx_id}`}
              >
                <Ionicons name="close" size={16} color={COLORS.ruby} />
                <Text style={styles.rejectBtnText}>Kataa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => {
                  setSelectedTx(tx);
                  setShowApproveModal(true);
                }}
                data-testid={`btn-approve-${tx.tx_id}`}
              >
                <LinearGradient
                  colors={[COLORS.emerald, COLORS.emeraldLight]}
                  style={styles.approveBtnGradient}
                >
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  <Text style={styles.approveBtnText}>Kubali</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTransactionsList = () => (
    <ScrollView
      style={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {loading && transactions.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.gold} style={{ marginTop: 40 }} />
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Hakuna Historia</Text>
          <Text style={styles.emptySubtitle}>No transactions yet</Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const statusBadge = getStatusBadge(tx.status);
          const roleBadge = getRoleBadge(tx.my_role);

          return (
            <View key={tx.tx_id} style={styles.txCard}>
              <View style={styles.txHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txItem}>{tx.item_name}</Text>
                  <Text style={styles.txId}>TX: {tx.tx_id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                  <Text style={[styles.statusText, { color: statusBadge.color }]}>
                    {statusBadge.label}
                  </Text>
                </View>
              </View>

              <View style={styles.txDetails}>
                <View style={styles.txDetailRow}>
                  <Text style={styles.txDetailLabel}>Nafasi yako:</Text>
                  <View style={styles.roleBadge}>
                    <Text>{roleBadge.icon}</Text>
                    <Text style={[styles.roleText, { color: roleBadge.color }]}>
                      {roleBadge.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.txDetailRow}>
                  <Text style={styles.txDetailLabel}>Bei:</Text>
                  <Text style={styles.txDetailValue}>{formatTZS(tx.buyer_price)}</Text>
                </View>
                {tx.commission !== undefined && tx.my_role === 'hawker' && (
                  <View style={styles.txDetailRow}>
                    <Text style={styles.txDetailLabel}>Faida yako:</Text>
                    <Text style={[styles.txDetailValue, { color: COLORS.emerald }]}>
                      +{formatTZS(tx.commission)}
                    </Text>
                  </View>
                )}
                {tx.supplier_cost !== undefined && tx.my_role === 'supplier' && (
                  <View style={styles.txDetailRow}>
                    <Text style={styles.txDetailLabel}>Unapata:</Text>
                    <Text style={[styles.txDetailValue, { color: COLORS.emerald }]}>
                      {formatTZS(tx.supplier_cost)}
                    </Text>
                  </View>
                )}
              </View>

              {tx.status === 'paid' && (tx.my_role === 'buyer' || tx.my_role === 'hawker') && (
                <TouchableOpacity
                  style={styles.releaseBtn}
                  onPress={() => {
                    // Handle release
                  }}
                  data-testid={`btn-release-${tx.tx_id}`}
                >
                  <LinearGradient
                    colors={[COLORS.gold, COLORS.goldDark]}
                    style={styles.releaseBtnGradient}
                  >
                    <Ionicons name="checkmark-done" size={16} color={COLORS.ink} />
                    <Text style={styles.releaseBtnText}>Toa Malipo / Release</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} data-testid="btn-close-escrow">
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Escrow Tatu / 3-Party</Text>
            <Text style={styles.headerSubtitle}>Mchuuzi ↔ Msambazaji ↔ Mnunuzi</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        {renderTabs()}

        {/* Content */}
        {activeTab === 'create' && renderCreateForm()}
        {activeTab === 'pending' && renderPendingList()}
        {activeTab === 'transactions' && renderTransactionsList()}

        {/* Approve Modal */}
        <Modal visible={showApproveModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Weka Bei Yako</Text>
              <Text style={styles.modalSubtitle}>Set Your Price</Text>

              {selectedTx && (
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Bidhaa:</Text>
                  <Text style={styles.modalInfoValue}>{selectedTx.item_name}</Text>
                  <Text style={styles.modalInfoLabel}>Bei ya Mnunuzi:</Text>
                  <Text style={styles.modalInfoValue}>{formatTZS(selectedTx.buyer_price)}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Bei Yako ya Jumla (TZS)</Text>
              <TextInput
                style={styles.input}
                value={supplierCost}
                onChangeText={setSupplierCost}
                placeholder="Bei unayoitaka kutoka mchuuzi"
                placeholderTextColor={COLORS.ink3}
                keyboardType="number-pad"
                data-testid="input-supplier-cost"
              />

              {selectedTx && supplierCost && (
                <View style={styles.splitPreview}>
                  <Text style={styles.splitTitle}>Mgawanyo wa Pesa</Text>
                  <View style={styles.splitRow}>
                    <Text>Wewe (Msambazaji):</Text>
                    <Text style={styles.splitAmount}>{formatTZS(parseFloat(supplierCost))}</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text>Mchuuzi (Faida):</Text>
                    <Text style={styles.splitAmount}>
                      {formatTZS(selectedTx.buyer_price - parseFloat(supplierCost) - (selectedTx.buyer_price * 0.025))}
                    </Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text>Jukwaa (2.5%):</Text>
                    <Text style={styles.splitAmount}>{formatTZS(selectedTx.buyer_price * 0.025)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setShowApproveModal(false);
                    setSupplierCost('');
                    setSelectedTx(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Funga</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, loading && { opacity: 0.5 }]}
                  onPress={handleApprove}
                  disabled={loading}
                  data-testid="btn-confirm-approve"
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Kubali</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.successModal}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>{successMessage.sw}</Text>
              <Text style={styles.successSubtitle}>{successMessage.en}</Text>
              <TouchableOpacity
                style={styles.successBtn}
                onPress={() => setShowSuccess(false)}
                data-testid="btn-close-success"
              >
                <Text style={styles.successBtnText}>Sawa / OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.ink,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.ink + '10',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink3,
  },
  tabTextActive: {
    color: COLORS.ink,
  },
  badge: {
    backgroundColor: COLORS.ruby,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: COLORS.goldLight + '30',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.goldDark,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: COLORS.ink3,
    lineHeight: 18,
  },
  formSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink3,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 15,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.surface3,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  feePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface3,
  },
  feeTitle: {
    fontSize: 13,
    color: COLORS.ink3,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  submitBtn: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitBtnText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.ink3,
    marginTop: 4,
  },
  txCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  txItem: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  txMeta: {
    fontSize: 12,
    color: COLORS.ink3,
  },
  txId: {
    fontSize: 11,
    color: COLORS.ink3,
    fontFamily: 'monospace',
  },
  txPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  txDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
    paddingTop: 12,
    gap: 8,
  },
  txDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDetailLabel: {
    fontSize: 13,
    color: COLORS.ink3,
  },
  txDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  txActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.ruby,
    backgroundColor: COLORS.rubyPale,
  },
  rejectBtnText: {
    color: COLORS.ruby,
    fontSize: 13,
    fontWeight: '600',
  },
  approveBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  approveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  approveBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  releaseBtn: {
    marginTop: 12,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  releaseBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  releaseBtnText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.ink3,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoLabel: {
    fontSize: 11,
    color: COLORS.ink3,
    marginTop: 8,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  splitPreview: {
    backgroundColor: COLORS.emeraldPale,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 12,
  },
  splitTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.emerald,
    marginBottom: 8,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  splitAmount: {
    fontWeight: '600',
    color: COLORS.ink,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface3,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink3,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  successModal: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: COLORS.ink3,
    textAlign: 'center',
    marginBottom: 20,
  },
  successBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  successBtnText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ThreePartyEscrow;
