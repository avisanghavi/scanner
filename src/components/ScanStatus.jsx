import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const ScanStatus = ({ confidence }) => {
  const confidencePercentage = Math.round(confidence || 0);
  
  let status, color;
  if (confidencePercentage >= 90) {
    status = 'High Confidence';
    color = '#34C759'; // Green
  } else if (confidencePercentage >= 70) {
    status = 'Medium Confidence';
    color = '#FF9500'; // Orange
  } else {
    status = 'Low Confidence';
    color = '#FF3B30'; // Red
  }
  
  return (
    <View style={styles.confidenceContainer}>
      <AnimatedCircularProgress
        size={isTablet ? 60 : 46}
        width={5}
        fill={confidencePercentage}
        tintColor={color}
        backgroundColor="#E5E5EA"
        rotation={0}
        lineCap="round"
        backgroundWidth={3}
      >
        {() => (
          <Text style={styles.confidenceText}>
            {confidencePercentage}%
          </Text>
        )}
      </AnimatedCircularProgress>
      <Text style={[styles.confidenceLabel, { color }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  confidenceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  confidenceLabel: {
    fontSize: isTablet ? 12 : 10,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default ScanStatus; 