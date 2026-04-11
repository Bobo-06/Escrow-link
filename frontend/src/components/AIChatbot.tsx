import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatbotProps {
  mode?: 'support' | 'dispute';
  transaction?: {
    item: string;
    amount: number;
    order_id: string;
  };
  onClose: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ mode = 'support', transaction, onClose }) => {
  const isDispute = mode === 'dispute';
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: isDispute
        ? `Habari! Mimi ni msuluhishi wa AI wa SecureTrade.\nHello! I'm SecureTrade's AI mediator.\n\n${transaction ? `Muamala: ${transaction.item} \u00b7 TZS ${transaction.amount?.toLocaleString()}` : ''}\n\nTafadhali elezea tatizo lako. / Please describe the issue.`
        : "Karibu SecureTrade! \ud83d\udc4b\nWelcome! How can I help?\n\n\u2022 Escrow inafanyaje kazi / How escrow works\n\u2022 M-Pesa & Airtel Money\n\u2022 Fuatilia agizo / Track order\n\u2022 Ripoti tatizo / Report a problem",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const endpoint = isDispute ? '/api/ai/dispute' : '/api/ai/support';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
          context: transaction,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      setSessionId(data.session_id);
      if (data.recommendation) {
        setRecommendation(data.recommendation);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Tatizo la muunganisho. / Connection error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isDispute && styles.headerDispute]}>
        <Text style={styles.headerIcon}>{isDispute ? '\u2696\ufe0f' : '\ud83e\udd16'}</Text>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {isDispute ? 'Msuluhishi wa AI \u00b7 AI Mediator' : 'Msaada \u00b7 Support'}
          </Text>
          <Text style={styles.headerSubtitle}>Claude AI \u00b7 Swahili & English \u00b7 Instant</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>\u2715</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
            ]}
          >
            {msg.role === 'assistant' && isDispute && (
              <Text style={styles.aiLabel}>SECURETRADE AI MEDIATOR</Text>
            )}
            <Text
              style={[
                styles.bubbleText,
                msg.role === 'user' && styles.bubbleTextUser,
              ]}
            >
              {msg.content}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <View style={styles.typingDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={styles.dot} />
              ))}
            </View>
          </View>
        )}

        {recommendation && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>
              {recommendation === 'release'
                ? '\u2705 AI: Toa kwa Muuzaji / Release to Seller'
                : recommendation === 'refund'
                ? '\u21a9 AI: Rudisha kwa Mnunuzi / Refund Buyer'
                : '\ud83d\udc64 Inaenda kwa Wakala / Escalating to Agent'}
            </Text>
            <Text style={styles.recommendationDesc}>
              {recommendation === 'escalate'
                ? 'Wakala wetu atawasiliana na pande zote ndani ya masaa 4. / Our agent will contact both parties within 4 hours.'
                : 'Pande zote lazima zithibitishe kabla pesa hazijahamia. / Both parties must confirm before funds move.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          placeholder={
            isDispute
              ? 'Elezea tatizo\u2026 / Describe issue\u2026'
              : 'Andika kwa Kiswahili au Kiingereza\u2026'
          }
          placeholderTextColor="rgba(10,10,15,0.4)"
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.sendBtnText}>\u27a4</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    height: 420,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    ...SHADOWS.lg,
    overflow: 'hidden',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.ink,
    gap: 10,
  },
  headerDispute: {
    backgroundColor: '#1a0a0a',
  },
  headerIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: COLORS.white,
    fontSize: 14,
  },
  chatArea: {
    flex: 1,
    padding: 12,
  },
  chatContent: {
    gap: 8,
  },
  bubble: {
    maxWidth: '85%',
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.ink,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    color: COLORS.ink,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: COLORS.white,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.emerald,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(10,10,15,0.4)',
    borderRadius: 3,
  },
  recommendationCard: {
    backgroundColor: COLORS.emeraldPale,
    borderWidth: 1.5,
    borderColor: 'rgba(26,122,90,0.25)',
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: 8,
  },
  recommendationTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.emerald,
    marginBottom: 6,
  },
  recommendationDesc: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.6)',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface3,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    fontSize: 13,
    backgroundColor: COLORS.white,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: COLORS.white,
    fontSize: 14,
  },
});
