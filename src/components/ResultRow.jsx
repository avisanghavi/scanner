import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const ResultRow = ({ label, value, icon, iconColor = '#0A84FF' }) => (
  <View style={styles.resultRow}>
    {icon && (
      <View style={[styles.resultIcon, { backgroundColor: `${iconColor}20` }]}>
        <Feather name={icon} size={isTablet ? 18 : 14} color={iconColor} />
      </View>
    )}
    <Text style={styles.resultLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.resultValue}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  resultIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultLabel: {
    fontSize: isTablet ? 16 : 14,
    color: '#8E8E93',
    width: '30%',
  },
  resultValue: {
    fontSize: isTablet ? 16 : 14,
    color: '#1c1c1e',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'right', // Ensure value aligns right
  },
});

export default ResultRow; 