import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const ErrorDisplay = ({ error, rawData }) => (
  <View style={styles.errorContainer}>
    <Feather name="alert-triangle" size={36} color="#FF3B30" style={{ marginBottom: 16 }} />
    <Text style={styles.errorText}>{error || 'Invalid MRZ data'}</Text>
    {rawData && (
      <View style={styles.rawDataContainer}>
        <Text style={styles.rawDataLabel}>Raw data:</Text>
        <Text style={styles.rawDataText}>{rawData}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: isTablet ? 17 : 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  rawDataContainer: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    width: '100%',
  },
  rawDataLabel: {
    fontSize: isTablet ? 14 : 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  rawDataText: {
    fontSize: isTablet ? 13 : 11,
    color: '#3C3C43',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default ErrorDisplay; 