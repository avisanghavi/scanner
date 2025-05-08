import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ResultRow from './ResultRow';
import { formatMRZDate } from '../utils/mrzParser';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const ScanResults = ({ parsedData }) => {
  if (!parsedData) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Document Information</Text>
      <View style={styles.resultContainer}>
        <ResultRow label="Document Type" value={parsedData.documentType} icon="file-text" iconColor="#0A84FF" />
        <ResultRow label="Surname" value={parsedData.surname} icon="user" iconColor="#FF9500" />
        <ResultRow label="First Name" value={parsedData.firstName} icon="user" iconColor="#FF9500" />
        <ResultRow label="Middle Name" value={parsedData.middleName} icon="user" iconColor="#FF9500" />
        <ResultRow label="Passport Number" value={parsedData.documentNumber} icon="hash" iconColor="#34C759" />
        <ResultRow label="Nationality" value={parsedData.nationality} icon="flag" iconColor="#FF2D55" />
        <ResultRow label="Date of Birth" value={formatMRZDate(parsedData.dateOfBirth, false)} icon="calendar" iconColor="#5856D6" />
        <ResultRow label="Sex" value={parsedData.sex} icon="user" iconColor="#FF9500" />
        <ResultRow label="Expiry Date" value={formatMRZDate(parsedData.expiryDate, true)} icon="calendar" iconColor="#5856D6" />
        <ResultRow label="Issuing Country" value={parsedData.issuingCountry} icon="globe" iconColor="#FF2D55" />
      </View>

      {/* Note: TravelInfo part might be better handled in the parent (ScanDetails or Review Screen) 
          as this component is primarily for MRZ doc info. Keep it simple for now. */}
      {/* 
      {parsedData.travelInfo && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Travel Information</Text>
          <View style={styles.resultContainer}>
            <ResultRow label="Carrier" value={parsedData.travelInfo.carrier} icon="navigation" iconColor="#0A84FF" />
            <ResultRow label="Routing" value={parsedData.travelInfo.routing} icon="map" iconColor="#34C759" />
            <ResultRow label="Flight Number" value={parsedData.travelInfo.flightNumber} icon="hash" iconColor="#FF9500" />
            <ResultRow label="Date of Flight" value={parsedData.travelInfo.dateOfFlight} icon="calendar" iconColor="#5856D6" />
            <ResultRow label="Seats" value={parsedData.travelInfo.seats} icon="pocket" iconColor="#FF2D55" />
            <ResultRow label="Meal" value={parsedData.travelInfo.meal} icon="coffee" iconColor="#8E8E93" />
            <ResultRow label="Assistance Request" value={parsedData.travelInfo.assistanceRequest} icon="help-circle" iconColor="#5856D6" />
            <ResultRow label="Remarks" value={parsedData.travelInfo.remarks} icon="message-square" iconColor="#34C759" />
          </View>
        </>
      )} 
      */}
    </View>
  );
};

// Styles needed for ScanResults (could be passed as props or defined here)
const styles = StyleSheet.create({
  section: {
    marginBottom: isTablet ? 24 : 20,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 12,
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 16 : 12,
    shadowColor: '#AEAEB2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  // Include styles for ResultRow if not using the imported component's styles directly
  // (Assuming imported ResultRow brings its own styles)
});

export default ScanResults; 