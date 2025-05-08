import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import ScanDetails from './ScanDetails'; // Import ScanDetails
import { getEventWithScans } from '../utils/db'; // Assuming db utils path
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const EventDetails = ({ event, onClose, onNewScan }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [error, setError] = useState(null);
  const [selectedScanIds, setSelectedScanIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    const loadScans = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!event || !event.id) {
          throw new Error('Invalid event data');
        }

        const eventWithScans = await getEventWithScans(event.id);
        if (!eventWithScans) {
          throw new Error('Event not found');
        }

        setScans(eventWithScans.scans || []);
      } catch (err) {
        console.error('Error loading scans:', err);
        setError('Failed to load scans. Please try again.');
        setScans([]);
      } finally {
        setLoading(false);
      }
    };

    loadScans();
  }, [event?.id]);

  useEffect(() => {
    // This effect manages the state of the 'Select All' checkbox based on individual selections
    const numScans = scans.length;
    const numSelected = selectedScanIds.length;
    if (numScans > 0 && numSelected === numScans) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedScanIds, scans]);

  const toggleScanSelection = (scanId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedScanIds((prev) =>
      prev.includes(scanId) ? prev.filter(id => id !== scanId) : [...prev, scanId]
    );
  };

  const handleSelectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectAll) {
      setSelectedScanIds([]);
      // setSelectAll(false); // This will be handled by the useEffect
    } else {
      setSelectedScanIds(scans.map(scan => scan.id));
      // setSelectAll(true); // This will be handled by the useEffect
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const selectedScans = scans.filter(scan => selectedScanIds.includes(scan.id));
      if (selectedScans.length === 0) {
        Alert.alert('Selection Required', 'Please select at least one scan to export.');
        return;
      }
      
      const headers = [
        'Label', 'Document Type', 'Surname', 'First Name', 'Middle Name', 'Document Number',
        'Nationality', 'Date of Birth', 'Sex', 'Expiry Date', 'Issuing Country',
        'Carrier', 'Routing', 'Flight Number', 'Date of Flight', 'Seats', 'Meal',
        'Birth City', 'Birth State', 'Birth Country', 'SSN', 'Current Lodging',
        'Phone Number', 'Email', 'Emergency Last Name', 'Emergency First Name',
        'Emergency Address 1', 'Emergency Address 2', 'Emergency City', 'Emergency State',
        'Emergency Country', 'Emergency Phone', 'Emergency Email', 'Accompanying Persons',
        'Billing Address 1', 'Billing Address 2', 'Billing City', 'Billing Country',
        'Billing Postal Code', 'Billing Phone', 'Billing Email', 'Medical Conditions',
        'Remarks', 'Saved At'
      ];
      const rows = [headers.join(',')];
      
      selectedScans.forEach(scan => {
        const row = headers.map(header => {
          // Simple mapping for now, adjust keys if needed
          const keyMap = {
              'Label': 'label', 'Document Type': 'documentType', 'Surname': 'surname', 'First Name': 'firstName',
              'Middle Name': 'middleName', 'Document Number': 'documentNumber', 'Nationality': 'nationality',
              'Date of Birth': 'dateOfBirth', 'Sex': 'sex', 'Expiry Date': 'expiryDate', 'Issuing Country': 'issuingCountry',
              'Carrier': 'carrier', 'Routing': 'routing', 'Flight Number': 'flightNumber', 'Date of Flight': 'dateOfFlight',
              'Seats': 'seats', 'Meal': 'meal', 'Birth City': 'birthCity', 'Birth State': 'birthState',
              'Birth Country': 'birthCountry', 'SSN': 'ssn', 'Current Lodging': 'currentLodging',
              'Phone Number': 'phoneNumber', 'Email': 'email', 'Emergency Last Name': 'emergencyLastName',
              'Emergency First Name': 'emergencyFirstName', 'Emergency Address 1': 'emergencyAddress1',
              'Emergency Address 2': 'emergencyAddress2', 'Emergency City': 'emergencyCity', 'Emergency State': 'emergencyState',
              'Emergency Country': 'emergencyCountry', 'Emergency Phone': 'emergencyPhone', 'Emergency Email': 'emergencyEmail',
              'Accompanying Persons': 'accompanyingPersons', 'Billing Address 1': 'billingAddress1',
              'Billing Address 2': 'billingAddress2', 'Billing City': 'billingCity', 'Billing Country': 'billingCountry',
              'Billing Postal Code': 'billingPostalCode', 'Billing Phone': 'billingPhone', 'Billing Email': 'billingEmail',
              'Medical Conditions': 'medicalConditions', 'Remarks': 'remarks', 'Saved At': 'savedAt'
          };
          const value = scan[keyMap[header]];
          // Escape commas and quotes within a value
          return value ? `"${String(value).replace(/"/g, '""')}"` : '""';
        }).join(',');
        rows.push(row);
      });
      
      const csvContent = rows.join('\n');
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const filename = `event_${event.name.replace(/\s+/g, '_')}_scans_${timestamp}.csv`;
      const filePath = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: `Export Scans for ${event.name}`,
          UTI: 'public.comma-separated-values-text'
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(`CSV Exported`, `File saved locally at: ${filePath}`);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
      Alert.alert('Export Failed', 'Could not export data: ' + err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExportLoading(false);
    }
  };

  if (selectedScan) {
    // Render the ScanDetails component when a scan is selected
    return <ScanDetails scan={selectedScan} onBack={() => setSelectedScan(null)} />;
  }

  return (
    <View style={styles.eventDetailsContainer}>
      {/* Floating Header */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={90} tint="light" style={styles.eventDetailsHeader}>
          <Text style={styles.eventDetailsTitle} numberOfLines={1}>{event?.name || 'Event Details'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#007AFF" />
          </TouchableOpacity>
        </BlurView>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView 
        style={styles.eventDetailsScroll}
        contentContainerStyle={{ paddingTop: 80, paddingBottom: 100 }} // Adjust padding for header/footer
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.eventDetailsHeaderContent}>
          <Text style={styles.eventDetailsTitle}>{event?.name || 'Event Details'}</Text>
          <Text style={styles.eventDescription}>{event?.description || 'No description provided.'}</Text>
          
          <View style={styles.eventMetaContainer}>
            <View style={styles.eventMetaItem}>
              <Feather name="calendar" size={16} color="#8E8E93" />
              <Text style={styles.eventMetaText}>
                Created: {new Date(event?.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.eventMetaItem}>
              <Feather name="file-text" size={16} color="#8E8E93" />
              <Text style={styles.eventMetaText}>
                {scans.length} {scans.length === 1 ? 'scan' : 'scans'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.scansSection}>
          <View style={styles.scansSectionHeader}>
            <Text style={styles.sectionTitle}>Scans</Text>
            
            <TouchableOpacity 
              onPress={handleSelectAll} 
              style={styles.selectAllButton}
              disabled={scans.length === 0}
            >
              <View style={[
                styles.checkbox, 
                selectAll ? styles.checkboxSelected : null,
                scans.length === 0 ? styles.checkboxDisabled : null
              ]}>
                {selectAll && <Feather name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={[
                styles.selectAllText,
                scans.length === 0 ? styles.selectAllTextDisabled : null
              ]}>
                Select All
              </Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading scans...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="#FF3B30" style={{ marginBottom: 16 }} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setLoading(true);
                  // This should re-trigger the useEffect for loading
                  // In a real app, might call a passed-in refresh function
                }}
              >
                <Feather name="refresh-cw" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : scans.length === 0 ? (
            <View style={styles.noScansContainer}>
              <LottieView 
                source={require('../../assets/empty-box.json')} 
                autoPlay 
                loop 
                style={{ width: 150, height: 150 }}
              />
              <Text style={styles.noScansText}>No scans added to this event yet.</Text>
              <TouchableOpacity
                style={styles.addScanButton}
                onPress={() => {
                  onClose(); 
                  onNewScan(event);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Feather name="plus" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.addScanButtonText}>Add First Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scansList}>
              {scans.map((scan) => (
                <View key={scan.id} style={styles.scanItemContainer}>
                  <TouchableOpacity 
                    onPress={() => toggleScanSelection(scan.id)} 
                    style={styles.scanCheckboxContainer}
                  >
                    <View style={[
                      styles.checkbox, 
                      selectedScanIds.includes(scan.id) ? styles.checkboxSelected : null
                    ]}>
                      {selectedScanIds.includes(scan.id) && <Feather name="check" size={16} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.scanCard}
                    onPress={() => {
                      setSelectedScan(scan);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.scanHeader}>
                       <View style={styles.scanTitleContainer}>
                        <Text style={styles.scanTitle} numberOfLines={1}>
                          {scan.label || `${scan.documentType || 'Doc'} - ${scan.surname || 'N/A'}`}
                        </Text>
                        {scan.confidence && (
                            <View style={[
                              styles.confidenceBadge, 
                              scan.confidence >= 90 ? styles.highConfidence : 
                              scan.confidence >= 70 ? styles.mediumConfidence : 
                              styles.lowConfidence
                            ]}>
                              <Text style={styles.confidenceBadgeText}>
                                {Math.round(scan.confidence)}%
                              </Text>
                            </View>
                          )}
                       </View>
                       <Text style={styles.scanDate}>
                         {new Date(scan.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       </Text>
                    </View>
                    
                    <View style={styles.scanDetails}>
                      <View style={styles.scanDetailItem}>
                        <Feather name="user" size={14} color="#8E8E93" style={{ marginRight: 6 }} />
                        <Text style={styles.scanDetailText}>
                           {scan.firstName} {scan.surname}
                        </Text>
                      </View>
                      <View style={styles.scanDetailItem}>
                         <Feather name="file-text" size={14} color="#8E8E93" style={{ marginRight: 6 }} />
                        <Text style={styles.scanDetailText}>
                          {scan.documentNumber || 'No Document #'}
                        </Text>
                      </View>
                    </View>
                    
                     <View style={styles.viewDetailsContainer}>
                      <Text style={styles.viewDetailsText}>View Details</Text>
                      <Feather name="chevron-right" size={16} color="#8E8E93" />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

       {/* Fixed Bottom Button Area */}
      <BlurView intensity={90} tint="light" style={styles.bottomActionContainer}>
         <TouchableOpacity
            style={styles.actionButtonPrimary} 
            onPress={() => {
              onClose();
              onNewScan(event);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Feather name="plus" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>New Scan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButtonSecondary, exportLoading && styles.exportButtonDisabled, selectedScanIds.length === 0 && styles.exportButtonDisabled]}
            onPress={handleExportCSV}
            disabled={exportLoading || selectedScanIds.length === 0}
          >
            {exportLoading ? (
              <ActivityIndicator size="small" color="#0A84FF" />
            ) : (
              <>
                <Feather name="download" size={20} color={selectedScanIds.length > 0 ? "#0A84FF" : "#C7C7CC"} style={{ marginRight: 8 }} />
                <Text style={[styles.actionButtonTextSecondary, selectedScanIds.length === 0 && { color: '#C7C7CC' }]}>
                  Export {selectedScanIds.length > 0 ? `(${selectedScanIds.length})` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  eventDetailsContainer: {
    flex: 1,
    backgroundColor: '#F9F9FB', 
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : (isTablet ? 50 : 44),
    paddingBottom: 16,
    // Background handled by BlurView
  },
  eventDetailsTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#1c1c1e',
    flex: 1, // Allow title to take space
    marginRight: 10, // Space before close button
  },
  closeButton: {
    padding: 8, // Increase tap target
  },
  eventDetailsScroll: {
    flex: 1,
  },
  eventDetailsHeaderContent: {
    padding: 20,
    paddingTop: isTablet ? 100 : 90, // Start content below the initial header space
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 20,
  },
  eventDescription: {
    fontSize: isTablet ? 16 : 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: isTablet ? 24 : 20,
  },
  eventMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventMetaText: {
    fontSize: isTablet ? 14 : 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  eventActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  newScanButton: {
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    flex: 1,
  },
  exportButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    flex: 1,
  },
  exportButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  newScanButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  scansSection: {
    paddingHorizontal: 20,
    flex: 1,
  },
  scansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#0A84FF',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0A84FF',
  },
  checkboxDisabled: {
    borderColor: '#C7C7CC',
  },
  selectAllText: {
    fontSize: isTablet ? 16 : 14,
    color: '#0A84FF',
  },
  selectAllTextDisabled: {
    color: '#C7C7CC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: isTablet ? 16 : 14,
    color: '#8E8E93',
    marginTop: 16,
  },
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
  retryButton: {
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  noScansContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noScansText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#3C3C43',
    textAlign: 'center',
    marginVertical: 8,
  },
  addScanButton: {
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  addScanButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  scansList: {
    flex: 1,
  },
  scanItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanCheckboxContainer: {
    paddingRight: 12,
    paddingVertical: 20,
  },
  scanCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  scanTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scanTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginRight: 8,
    flexShrink: 1, // Allow title to shrink if needed
  },
  scanDate: {
    fontSize: isTablet ? 14 : 12,
    color: '#8E8E93',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto', // Push to the right
  },
  confidenceBadgeText: {
    fontSize: isTablet ? 12 : 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  highConfidence: {
    backgroundColor: '#34C759',
  },
  mediumConfidence: {
    backgroundColor: '#FF9500',
  },
  lowConfidence: {
    backgroundColor: '#FF3B30',
  },
  scanDetails: {
    marginBottom: 12,
  },
  scanDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  scanDetailText: {
    fontSize: isTablet ? 14 : 13,
    color: '#3C3C43',
  },
  travelInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
    marginBottom: 12,
  },
  travelInfoTitle: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  travelDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  travelDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  travelDetailText: {
    fontSize: isTablet ? 13 : 12,
    color: '#3C3C43',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  viewDetailsText: {
    fontSize: isTablet ? 14 : 12,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 8,
  },
  bottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    flex: 1,
  },
  actionButtonSecondary: {
    backgroundColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#0A84FF',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
});

export default EventDetails; 