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
import * as FileSystem from 'expo-file-system';

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
    let firstName = '';
    let middleName = '';
    if (nameComponents[1]) {
      const givenNamesArr = nameComponents[1].replace(/</g, ' ').trim().split(' ').filter(Boolean);
      firstName = givenNamesArr[0] || '';
      middleName = givenNamesArr.length > 1 ? givenNamesArr.slice(1).join(' ') : '';
    }
    const documentNumber = lines[1].slice(0, 9).trim();
    const nationality = lines[1].slice(10, 13).trim();
    const dateOfBirth = lines[1].slice(13, 19).trim();
    const sex = lines[1].slice(20, 21).trim();
    const expiryDate = lines[1].slice(21, 27).trim();

    return {
      documentType,
      issuingCountry,
      surname,
      firstName,
      middleName,
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

const saveScanToFile = async (scanData) => {
  try {
    const fileUri = FileSystem.documentDirectory + 'scans.json';
    let existing = [];
    // Check if file exists and read existing data
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(fileUri);
      existing = content ? JSON.parse(content) : [];
    }
    // Add new scan with timestamp
    const scanWithTimestamp = {
      ...scanData,
      savedAt: new Date().toISOString(),
    };
    existing.push(scanWithTimestamp);
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(existing, null, 2));
    alert('Scan saved!');
  } catch (e) {
    alert('Failed to save scan: ' + e.message);
  }
};

const ResultRow = ({ label, value }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel} numberOfLines={1}>{label}:</Text>
    <Text style={styles.resultValue}>{value}</Text>
  </View>
);

const ScanResults = ({ parsedData }) => (
  <View>
    <ResultRow label="Document Type" value={parsedData.documentType} />
    <ResultRow label="Surname" value={parsedData.surname} />
    <ResultRow label="First Name" value={parsedData.firstName} />
    <ResultRow label="Middle Name" value={parsedData.middleName} />
    <ResultRow label="Document Number" value={parsedData.documentNumber} />
    <ResultRow label="Nationality" value={parsedData.nationality} />
    <ResultRow label="Date of Birth" value={formatMRZDate(parsedData.dateOfBirth, false)} />
    <ResultRow label="Sex" value={parsedData.sex} />
    <ResultRow label="Expiry Date" value={formatMRZDate(parsedData.expiryDate, true)} />
    <ResultRow label="Issuing Country" value={parsedData.issuingCountry} />
    {parsedData.savedAt && (
      <ResultRow label="Saved At" value={new Date(parsedData.savedAt).toLocaleString()} />
    )}
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
  const [savedScans, setSavedScans] = useState([]);
  const [showSavedScans, setShowSavedScans] = useState(false);
  const [scanConfirmed, setScanConfirmed] = useState(false);

  const handleScan = (data) => {
    const parsedData = parseMRZ(data);
    setLastScan({
      raw: data,
      parsed: parsedData,
      error: !parsedData ? 'Could not parse MRZ data' : null
    });
    setScanConfirmed(false);
    setShowScanner(false);
  };

  const loadSavedScans = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'scans.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(fileUri);
        setSavedScans(content ? JSON.parse(content) : []);
      } else {
        setSavedScans([]);
      }
      setShowSavedScans(true);
    } catch (e) {
      alert('Failed to load scans: ' + e.message);
    }
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

          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#888', marginTop: 16 }]}
            onPress={loadSavedScans}
          >
            <Text style={styles.buttonText}>View Saved Scans</Text>
          </TouchableOpacity>

          {lastScan && (
            <View style={styles.lastScanContainer}>
              <Text style={styles.lastScanTitle}>Last Scan Result:</Text>
              {lastScan.parsed ? (
                <>
                  <ScanResults parsedData={lastScan.parsed} />
                  {!scanConfirmed ? (
                    <TouchableOpacity
                      style={[styles.startButton, {marginTop: 16, backgroundColor: '#007AFF'}]}
                      onPress={() => setScanConfirmed(true)}
                    >
                      <Text style={styles.buttonText}>Confirm</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.startButton, {marginTop: 16, backgroundColor: '#34c759'}]}
                      onPress={() => saveScanToFile(lastScan.parsed)}
                    >
                      <Text style={styles.buttonText}>Save Scan</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <ErrorDisplay error={lastScan.error} rawData={lastScan.raw} />
              )}
            </View>
          )}

          {showSavedScans && (
            <View style={styles.savedScansContainer}>
              <Text style={styles.lastScanTitle}>Saved Scans:</Text>
              {savedScans.length === 0 ? (
                <Text style={styles.errorText}>No saved scans found.</Text>
              ) : (
                savedScans.map((scan, idx) => (
                  <View key={idx} style={styles.savedScanCard}>
                    <ScanResults parsedData={scan} />
                  </View>
                ))
              )}
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: '#FF3B30', marginTop: 8 }]}
                onPress={() => setShowSavedScans(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
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
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultLabel: {
    width: 150,
    fontWeight: '700',
    color: '#666',
    marginRight: 10,
    fontSize: 15,
  },
  resultValue: {
    flex: 1,
    color: '#333',
    fontSize: 15,
    textAlign: 'left',
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
  savedScansContainer: {
    marginTop: 20,
    padding: 8,
    alignItems: 'center',
  },
  savedScanCard: {
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 320,
    maxWidth: 420,
    width: '90%',
  },
});