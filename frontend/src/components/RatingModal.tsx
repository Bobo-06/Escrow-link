import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

interface RatingModalProps {
  visible: boolean;
  sellerName: string;
  orderId: string;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

export function RatingModal({ visible, sellerName, orderId, onSubmit, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment);
      setRating(0);
      setComment('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.icon}>⭐</Text>
          <Text style={styles.title}>Kadiria Muuzaji</Text>
          <Text style={styles.subtitle}>Rate {sellerName}</Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Text style={[styles.star, rating >= star && styles.starActive]}>
                  {rating >= star ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Labels */}
          <View style={styles.labelsRow}>
            <Text style={styles.ratingLabel}>Mbaya</Text>
            <Text style={styles.ratingLabel}>Nzuri Sana</Text>
          </View>

          {/* Comment */}
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Maoni ya ziada (si lazima) / Optional comment"
            placeholderTextColor="rgba(10,10,15,0.4)"
            multiline
            numberOfLines={3}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0}
          >
            <Text style={styles.submitBtnText}>Wasilisha Ukadiriaji / Submit Rating</Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
            <Text style={styles.skipBtnText}>Ruka / Skip</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  star: {
    fontSize: 36,
    color: COLORS.surface3,
  },
  starActive: {
    color: '#FFD700',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.4)',
  },
  commentInput: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  skipBtn: {
    padding: 12,
  },
  skipBtnText: {
    color: 'rgba(10,10,15,0.5)',
    fontSize: 13,
  },
});
