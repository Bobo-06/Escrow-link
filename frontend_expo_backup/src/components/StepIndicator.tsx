import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, STEPS, RADIUS } from '../constants/theme';

interface StepIndicatorProps {
  current: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => (
  <View style={styles.container}>
    {STEPS.map((step, i) => (
      <React.Fragment key={i}>
        <View
          style={[
            styles.dot,
            i < current && styles.dotDone,
            i === current && styles.dotActive,
            i > current && styles.dotPending,
          ]}
        >
          <Text
            style={[
              styles.dotText,
              i < current && styles.dotTextDone,
              i === current && styles.dotTextActive,
            ]}
          >
            {i < current ? '✓' : i + 1}
          </Text>
        </View>
        {i < STEPS.length - 1 && (
          <View
            style={[
              styles.line,
              i < current ? styles.lineDone : styles.linePending,
            ]}
          />
        )}
      </React.Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: COLORS.emerald,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dotPending: {
    backgroundColor: COLORS.surface2,
  },
  dotText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.3)',
  },
  dotTextDone: {
    color: COLORS.white,
  },
  dotTextActive: {
    color: COLORS.ink,
  },
  line: {
    height: 2,
    flex: 1,
    maxWidth: 18,
  },
  lineDone: {
    backgroundColor: COLORS.emerald,
  },
  linePending: {
    backgroundColor: COLORS.surface3,
  },
});
