import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SHADOWS, formatTZS } from '../../src/constants/theme';
import { BottomNav } from '../../src/components/BottomNav';
import { TransactionHistory } from '../../src/components/TransactionHistory';
import { AIChatbot } from '../../src/components/AIChatbot';

// KYC Tier Configuration
const KYC_TIERS = [
  {
    tier: 0,
    name: 'Mgeni',
    nameEn: 'Guest',
    limit: 50000,
    badge: '⚪',
    color: '#9CA3AF',
    requirements: ['Nambari ya simu / Phone number'],
    completed: true,
  },
  {
    tier: 1,
    name: 'Msingi',
    nameEn: 'Basic',
    limit: 500000,
    badge: '🟢',
    color: '#22C55E',
    requirements: ['Jina kamili / Full name', 'Barua pepe / Email'],
    completed: true,
  },
  {
    tier: 2,
    name: 'Imethibitishwa',
    nameEn: 'Verified',
    limit: 5000000,
    badge: '🔵',
    color: '#3B82F6',
    requirements: ['Kitambulisho cha NIDA / NIDA ID', 'Picha ya uso / Selfie'],
    completed: false,
  },
  {
    tier: 3,
    name: 'Biashara',
    nameEn: 'Business',
    limit: 50000000,
    badge: '🟡',
    color: '#F59E0B',
    requirements: ['Leseni ya biashara / Business license', 'TIN number'],
    completed: false,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, sessionToken, updateProfile, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'settings'>('profile');
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    business_name: user?.business_name || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [kycTier, setKycTier] = useState(1); // Current user's KYC tier

  // Determine current KYC tier based on user data
  useEffect(() => {
    if (user) {
      let tier = 0;
      if (user.phone) tier = 1;
      if (user.name && user.email) tier = 1;
      if (user.is_verified) tier = 2;
      if (user.business_name) tier = Math.max(tier, 2);
      setKycTier(tier);
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile(formData);
      Alert.alert('Imefanikiwa / Success', 'Wasifu umesasishwa / Profile updated');
    } catch (error: any) {
      Alert.alert('Kosa / Error', error.response?.data?.detail || 'Imeshindikana kusasisha / Could not update');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Toka / Sign Out',
      'Una uhakika unataka kutoka? / Are you sure you want to sign out?',
      [
        { text: 'Hapana / No', style: 'cancel' },
        { 
          text: 'Ndiyo / Yes', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            if (Platform.OS === 'web') {
              window.location.href = '/';
            } else {
              router.replace('/');
            }
          }
        },
      ]
    );
  };

  const handleStartKYC = (tier: number) => {
    Alert.alert(
      'Uthibitisho wa KYC',
      `Ili kufikia kiwango cha ${KYC_TIERS[tier].name}, unahitaji:\n\n${KYC_TIERS[tier].requirements.join('\n')}\n\nTo reach ${KYC_TIERS[tier].nameEn} tier, you need the above documents.`,
      [
        { text: 'Baadaye / Later', style: 'cancel' },
        { text: 'Anza Sasa / Start Now', onPress: () => Alert.alert('KYC', 'Kipengele kinakuja hivi karibuni / Feature coming soon') }
      ]
    );
  };

  if (showHistory) {
    return <TransactionHistory onClose={() => setShowHistory(false)} />;
  }

  const currentTier = KYC_TIERS[kycTier];
  const nextTier = KYC_TIERS[kycTier + 1];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.ink, COLORS.ink2]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wasifu / Profile</Text>
          <TouchableOpacity onPress={() => setShowChat(true)} style={styles.chatBtn}>
            <Ionicons name="chatbubble-ellipses" size={22} color={COLORS.gold} />
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <View style={[styles.kycBadge, { backgroundColor: currentTier.color }]}>
              <Text style={styles.kycBadgeText}>{currentTier.badge}</Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Muuzaji'}</Text>
            <Text style={styles.userEmail}>{user?.email || user?.phone}</Text>
            <View style={styles.tierBadge}>
              <Text style={[styles.tierText, { color: currentTier.color }]}>
                {currentTier.badge} KYC: {currentTier.name} / {currentTier.nameEn}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabs}>
          {[
            { id: 'profile', icon: 'person', label: 'Wasifu' },
            { id: 'kyc', icon: 'shield-checkmark', label: 'KYC' },
            { id: 'settings', icon: 'settings', label: 'Mipangilio' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.id ? COLORS.gold : 'rgba(255,255,255,0.4)'} 
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TAARIFA BINAFSI / PERSONAL INFO</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Jina Kamili / Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="Jina lako"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nambari ya Simu / Phone</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      placeholder="+255 7XX XXX XXX"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Jina la Biashara / Business Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="storefront-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={formData.business_name}
                      onChangeText={(text) => setFormData({ ...formData, business_name: text })}
                      placeholder="Jina la duka lako"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, isLoading && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={isLoading}
                >
                  <Text style={styles.saveBtnText}>
                    {isLoading ? 'Inasasisha...' : 'Hifadhi Mabadiliko / Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* KYC Tab */}
          {activeTab === 'kyc' && (
            <>
              {/* Current Limit */}
              <View style={styles.limitCard}>
                <Text style={styles.limitLabel}>Kikomo Chako cha Sasa / Your Current Limit</Text>
                <Text style={styles.limitValue}>{formatTZS(currentTier.limit)}</Text>
                <Text style={styles.limitSubtext}>kwa muamala / per transaction</Text>
              </View>

              {/* KYC Tiers */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>VIWANGO VYA KYC / KYC TIERS</Text>
                
                {KYC_TIERS.map((tier, index) => {
                  const isCompleted = index <= kycTier;
                  const isCurrent = index === kycTier;
                  const isNext = index === kycTier + 1;

                  return (
                    <View 
                      key={tier.tier} 
                      style={[
                        styles.tierCard,
                        isCompleted && styles.tierCardCompleted,
                        isCurrent && styles.tierCardCurrent,
                      ]}
                    >
                      <View style={styles.tierHeader}>
                        <View style={styles.tierLeft}>
                          <Text style={styles.tierBadgeIcon}>{tier.badge}</Text>
                          <View>
                            <Text style={styles.tierName}>{tier.name}</Text>
                            <Text style={styles.tierNameEn}>{tier.nameEn}</Text>
                          </View>
                        </View>
                        <View style={styles.tierRight}>
                          <Text style={styles.tierLimit}>{formatTZS(tier.limit)}</Text>
                          {isCompleted && <Ionicons name="checkmark-circle" size={20} color={COLORS.emerald} />}
                        </View>
                      </View>

                      <View style={styles.tierRequirements}>
                        {tier.requirements.map((req, i) => (
                          <View key={i} style={styles.requirementRow}>
                            <Ionicons 
                              name={isCompleted ? "checkmark" : "ellipse-outline"} 
                              size={14} 
                              color={isCompleted ? COLORS.emerald : COLORS.textSecondary} 
                            />
                            <Text style={[styles.requirementText, isCompleted && styles.requirementCompleted]}>
                              {req}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {isNext && (
                        <TouchableOpacity 
                          style={styles.upgradeBtn}
                          onPress={() => handleStartKYC(tier.tier)}
                        >
                          <Text style={styles.upgradeBtnText}>Panda Kiwango / Upgrade</Text>
                          <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
                        </TouchableOpacity>
                      )}

                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>KIWANGO CHAKO / YOUR TIER</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MIPANGILIO / SETTINGS</Text>
              
              {[
                { icon: 'notifications-outline', label: 'Arifa / Notifications', action: () => {} },
                { icon: 'language-outline', label: 'Lugha / Language', action: () => {} },
                { icon: 'shield-outline', label: 'Usalama / Security', action: () => {} },
                { icon: 'help-circle-outline', label: 'Msaada / Help', action: () => setShowChat(true) },
                { icon: 'document-text-outline', label: 'Masharti / Terms', action: () => {} },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={styles.settingRow} onPress={item.action}>
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon as any} size={22} color={COLORS.ink} />
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                <Text style={styles.logoutBtnText}>Toka / Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <BottomNav
        active="profile"
        onHome={() => router.push('/seller')}
        onHistory={() => setShowHistory(true)}
        onSupport={() => setShowChat(true)}
        onProfile={() => {}}
      />

      {/* AI Chatbot */}
      {showChat && (
        <AIChatbot
          isVisible={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  chatBtn: {
    padding: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.gold,
  },
  kycBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.ink,
  },
  kycBadgeText: {
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  tierBadge: {
    marginTop: 8,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: COLORS.gold,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  saveBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  limitCard: {
    backgroundColor: COLORS.ink,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  limitLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  limitValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.gold,
    marginTop: 8,
  },
  limitSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  tierCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    ...SHADOWS.sm,
  },
  tierCardCompleted: {
    borderColor: COLORS.emerald,
    borderWidth: 1.5,
  },
  tierCardCurrent: {
    borderColor: COLORS.gold,
    borderWidth: 2,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadgeIcon: {
    fontSize: 28,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  tierNameEn: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tierRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  tierLimit: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  tierRequirements: {
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  requirementCompleted: {
    color: COLORS.emerald,
    textDecorationLine: 'line-through',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    marginTop: 14,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.goldPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.goldDark,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.ink,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: RADIUS.md,
    marginTop: 24,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
