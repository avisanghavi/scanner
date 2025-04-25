import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import MRZScanner from './MRZScanner';

const parseMRZ = (mrzText) => {
  try {
    const cleanText = mrzText.replace(/[\n\r]/g, '');
    const lines = [
      cleanText.slice(0, 44),
      cleanText.slice(44, 88),
      cleanText.slice(88)
    ].filter(line => line.length > 0);

    if (lines.length < 2) return null;

    const documentType = lines[0].slice(0, 2).trim();
    const issuingCountry = lines[0].slice(2, 5).trim();
    const namePart = lines[0].slice(5);
    const nameComponents = namePart.split('<<');
    const surname = nameComponents[0].replace(/</g, ' ').trim();
    const givenNames = nameComponents[1] ? nameComponents[1].replace(/</g, ' ').trim() : '';
    const documentNumber = lines[1].slice(0, 9).trim();
    const nationality = lines[1].slice(10, 13).trim();
    const dateOfBirth = lines[1].slice(13, 19).trim();
    const sex = lines[1].slice(20, 21).trim();
    const expiryDate = lines[1].slice(21, 27).trim();

    return {
      documentType,
      issuingCountry,
      surname,
      givenNames,
      documentNumber,
      nationality,
      dateOfBirth,
      sex,
      expiryDate
    };
  } catch (error) {
    console.error('Error parsing MRZ:', error);
    return null;
  }
};

const formatMRZDate = (dateStr, isExpiryDate = false) => {
  if (!dateStr || dateStr.length !== 6) return 'Invalid date';
  
  const year = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);
  
  let fullYear;
  if (isExpiryDate) {
    fullYear = `20${year}`;
  } else {
    fullYear = parseInt(year) > 20 ? `19${year}` : `20${year}`;
  }
  
  const date = new Date(`${fullYear}-${month}-${day}`);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  return `${day}/${month}/${fullYear}`;
};

const ResultRow = ({ label, value }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}:</Text>
    <Text style={styles.resultValue}>{value}</Text>
  </View>
);

const ScanResults = ({ parsedData }) => (
  <View>
    <ResultRow label="Document Type" value={parsedData.documentType} />
    <ResultRow label="Surname" value={parsedData.surname} />
    <ResultRow label="Given Names" value={parsedData.givenNames} />
    <ResultRow label="Document Number" value={parsedData.documentNumber} />
    <ResultRow label="Nationality" value={parsedData.nationality} />
    <ResultRow label="Date of Birth" value={formatMRZDate(parsedData.dateOfBirth, false)} />
    <ResultRow label="Sex" value={parsedData.sex} />
    <ResultRow label="Expiry Date" value={formatMRZDate(parsedData.expiryDate, true)} />
    <ResultRow label="Issuing Country" value={parsedData.issuingCountry} />
  </View>
);

const ErrorDisplay = ({ error, rawData }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{error || 'Invalid MRZ data'}</Text>
    <Text style={styles.rawDataText}>Raw data: {rawData}</Text>
  </View>
);

export default function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const handleScan = (data) => {
    const parsedData = parseMRZ(data);
    setLastScan({
      raw: data,
      parsed: parsedData,
      error: !parsedData ? 'Could not parse MRZ data' : null
    });
    setShowScanner(false);
  };

  if (showScanner) {
    return <MRZScanner onMRZRead={handleScan} onClose={() => setShowScanner(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>MRZ Scanner</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.description}>
              Scan MRZ (Machine Readable Zone) from passports, ID cards, and travel documents
            </Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setShowScanner(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Start Scanner</Text>
          </TouchableOpacity>

          {lastScan && (
            <View style={styles.lastScanContainer}>
              <Text style={styles.lastScanTitle}>Last Scan Result:</Text>
              {lastScan.parsed ? (
                <ScanResults parsedData={lastScan.parsed} />
              ) : (
                <ErrorDisplay error={lastScan.error} rawData={lastScan.raw} />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  lastScanContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  lastScanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultLabel: {
    flex: 1,
    fontWeight: '600',
    color: '#666',
  },
  resultValue: {
    flex: 2,
    color: '#333',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff8f8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  rawDataText: {
    color: '#666',
    fontSize: 12,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  version: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});