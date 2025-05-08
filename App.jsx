import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  Share,
  Animated,
  Haptics,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { Feather } from '@expo/vector-icons'; // Import icon library
import MRZScanner from './MRZScanner';
import { useDatabase } from './src/hooks/useDatabase';
import { testSQLite } from './src/utils/dbTest';
import { getEventWithScans, updateEvent, deleteAllData, insertScan, migrateDatabase } from './src/utils/db';
import generateFormPDF from './src/utils/pdfGenerator';
import MRZRecognizer from './MRZRecognizer.js';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768; // iPad mini width is 768pt

const ResultRow = ({ label, value }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel} numberOfLines={1}>{label}:</Text>
    <Text style={styles.resultValue}>{value || 'N/A'}</Text>
  </View>
);

const parseMRZ = (mrzText) => {
  try {
    console.log('Parsing MRZ text:', mrzText);
    
    // Clean the text and split into lines
    const lines = mrzText.split('\n').map(line => line.trim());
    console.log('Cleaned lines:', lines);

    if (lines.length < 2) {
      console.error('Not enough lines in MRZ data');
      return null;
    }

    // First line parsing (TD1 format)
    const line1 = lines[0];
    const documentType = line1.substring(0, 2).trim();
    const issuingCountry = line1.substring(2, 5).trim();
    
    // Extract surname and given names
    const nameParts = line1.substring(5).split('<<').filter(Boolean);
    const surname = nameParts[0]?.replace(/</g, ' ').trim() || '';
    const givenNames = nameParts[1]?.replace(/</g, ' ').trim() || '';
    const [firstName, ...middleNames] = givenNames.split(' ');
    const middleName = middleNames.join(' ');

    // Second line parsing
    const line2 = lines[1];
    const documentNumber = line2.substring(0, 9).trim();
    const nationality = line2.substring(10, 13).trim();
    const dateOfBirth = line2.substring(13, 19).trim();
    const sex = line2.substring(20, 21).trim().toUpperCase() === '1' ? 'F' : 
                line2.substring(20, 21).trim().toUpperCase() === '2' ? 'M' : 
                line2.substring(20, 21).trim().toUpperCase();
    const expiryDate = line2.substring(21, 27).trim();

    const parsedData = {
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

    console.log('Parsed MRZ data:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('Error parsing MRZ:', error);
    return null;
  }
};

const formatMRZDate = (dateStr, isExpiryDate = false) => {
  if (!dateStr || dateStr.length !== 6) return '';
  
  try {
  const year = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);
    
    // Basic validation
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      return '';
    }
  
  let fullYear;
  if (isExpiryDate) {
    fullYear = `20${year}`;
  } else {
    fullYear = parseInt(year) > 20 ? `19${year}` : `20${year}`;
  }
  
  return `${day}/${month}/${fullYear}`;
  } catch (e) {
    console.log('Date formatting error:', e);
    return '';
  }
};

const SignaturePage = ({ onSave, onCancel }) => {
  const [signature, setSignature] = useState(null);
  const signatureRef = useRef(null);

  const handleSignature = (signatureData) => {
    console.log('Signature data received:', signatureData ? signatureData.substring(0, 50) + '...' : 'null');
    setSignature(signatureData);
    // Pass the signature data to the parent component
    onSave(signatureData);
  };

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
      setSignature(null);
    }
  };

  const handleConfirm = () => {
    console.log('Confirming signature...');
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    }
  };

  const handleEmpty = () => {
    console.log('Empty signature detected');
    Alert.alert('Error', 'Please provide your signature');
  };

  const handleEnd = () => {
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    }
  };

  const style = `.m-signature-pad {
    margin: 0;
    padding: 0;
    border: none;
    box-shadow: none;
  }
  .m-signature-pad--body {
    padding: 0;
    margin: 0;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }
  .m-signature-pad--body canvas {
    margin: 0;
    padding: 0;
    border-radius: 8px;
  }
  .m-signature-pad--footer {
    display: none;
  }`;

  return (
    <View style={styles.signaturePageContainer}>
      <View style={styles.signaturePageHeader}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.signaturePageTitle}>Signature</Text>
        <View style={styles.headerSpacer} />
        </View>

      <View style={styles.signaturePageContent}>
        <Text style={styles.signaturePageSubtitle}>
          Please sign below to confirm all information is accurate
        </Text>

        <View style={styles.signatureWrapper}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onEnd={handleEnd}
            webStyle={style}
            descriptionText=""
            clearText=""
            confirmText=""
            autoClear={false}
            imageType="image/png"
            backgroundColor="rgb(255,255,255)"
            penColor="rgb(0,0,0)"
            dotSize={1}
            minWidth={1}
            maxWidth={2}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
      </View>
      </View>
    </View>
  );
};

const TravelInfoSection = ({ data, onUpdate }) => {
  const [currentSection, setCurrentSection] = useState('flightDetails');
  const [showSignature, setShowSignature] = useState(false);

  // Add debug logging
  useEffect(() => {
    console.log('TravelInfoSection data:', data);
  }, [data]);

  const handleFieldUpdate = (fieldName, value) => {
    console.log('Updating field:', fieldName, 'with value:', value);
    const updatedData = {
      ...data,
      [fieldName]: value
    };
    console.log('Updated data:', updatedData);
    onUpdate(updatedData);
  };

  const handleSignatureSave = (signatureData) => {
    console.log('Signature saved:', signatureData ? signatureData.substring(0, 50) + '...' : 'null');
    const updatedData = {
      ...data,
      signature: signatureData
    };
    onUpdate(updatedData);
    setShowSignature(false);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'flightDetails':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Flight Details</Text>
    <View style={styles.travelInfoGrid}>
      <View style={styles.travelInfoRow}>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Carrier</Text>
          <TextInput
            style={styles.input}
            value={data.carrier}
                    onChangeText={(text) => handleFieldUpdate('carrier', text)}
            placeholder="Enter carrier"
          />
        </View>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Routing</Text>
          <TextInput
            style={styles.input}
            value={data.routing}
                    onChangeText={(text) => handleFieldUpdate('routing', text)}
            placeholder="Enter routing"
          />
        </View>
      </View>
      <View style={styles.travelInfoRow}>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Flight Number</Text>
          <TextInput
            style={styles.input}
            value={data.flightNumber}
                    onChangeText={(text) => handleFieldUpdate('flightNumber', text)}
            placeholder="Enter flight number"
          />
        </View>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Date of Flight</Text>
          <TextInput
            style={styles.input}
            value={data.dateOfFlight}
                    onChangeText={(text) => handleFieldUpdate('dateOfFlight', text)}
                    placeholder="Enter date of flight"
          />
        </View>
      </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setCurrentSection('personalInfo')}
            >
              <Text style={styles.continueButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'personalInfo':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Personal Information</Text>
            <View style={styles.travelInfoGrid}>
      <View style={styles.travelInfoRow}>
        <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Birth City</Text>
          <TextInput
            style={styles.input}
                    value={data.birthCity}
                    onChangeText={(text) => handleFieldUpdate('birthCity', text)}
                    placeholder="Enter birth city"
          />
        </View>
        <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Birth State</Text>
          <TextInput
            style={styles.input}
                    value={data.birthState}
                    onChangeText={(text) => handleFieldUpdate('birthState', text)}
                    placeholder="Enter birth state"
          />
        </View>
      </View>
      <View style={styles.travelInfoRow}>
        <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Birth Country</Text>
          <TextInput
            style={styles.input}
                    value={data.birthCountry}
                    onChangeText={(text) => handleFieldUpdate('birthCountry', text)}
                    placeholder="Enter birth country"
          />
        </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>SSN</Text>
                  <TextInput
                    style={styles.input}
                    value={data.ssn}
                    onChangeText={(text) => handleFieldUpdate('ssn', text)}
                    placeholder="Enter SSN"
                    secureTextEntry
                  />
      </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setCurrentSection('contactInfo')}
            >
              <Text style={styles.continueButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'contactInfo':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Current Lodging</Text>
            <View style={styles.travelInfoGrid}>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Current Lodging</Text>
                  <TextInput
                    style={styles.input}
                    value={data.currentLodging}
                    onChangeText={(text) => handleFieldUpdate('currentLodging', text)}
                    placeholder="Enter current lodging"
                  />
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={data.phoneNumber}
                    onChangeText={(text) => handleFieldUpdate('phoneNumber', text)}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={data.email}
                    onChangeText={(text) => handleFieldUpdate('email', text)}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setCurrentSection('additionalInfo')}
            >
              <Text style={styles.continueButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'additionalInfo':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Medical Condition</Text>
            <View style={styles.travelInfoGrid}>
      <View style={styles.travelInfoRow}>
        <View style={[styles.travelInfoField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Medical Condition, current injuries, or limited mobility relevant to evacuation</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
                    value={data.medicalConditions}
                    onChangeText={(text) => handleFieldUpdate('medicalConditions', text)}
                    placeholder="Enter medical conditions, injuries, or mobility limitations"
                    multiline
            numberOfLines={3}
          />
        </View>
      </View>
    </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setCurrentSection('billingAddress')}
            >
              <Text style={styles.continueButtonText}>Next</Text>
            </TouchableOpacity>
  </View>
);

      case 'billingAddress':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Billing Address</Text>
            <View style={styles.travelInfoGrid}>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Street Address</Text>
                  <TextInput
                    style={styles.input}
                    value={data.billingStreet}
                    onChangeText={(text) => handleFieldUpdate('billingStreet', text)}
                    placeholder="Enter street address"
                  />
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={data.billingCity}
                    onChangeText={(text) => handleFieldUpdate('billingCity', text)}
                    placeholder="Enter city"
                  />
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={data.billingState}
                    onChangeText={(text) => handleFieldUpdate('billingState', text)}
                    placeholder="Enter state"
                  />
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>ZIP Code</Text>
                  <TextInput
                    style={styles.input}
                    value={data.billingZip}
                    onChangeText={(text) => handleFieldUpdate('billingZip', text)}
                    placeholder="Enter ZIP code"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setCurrentSection('emergencyContact')}
            >
              <Text style={styles.continueButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'emergencyContact':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Emergency Contact</Text>
            <Text style={styles.sectionNote}>Do not put someone traveling with you</Text>
            <View style={styles.travelInfoGrid}>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={data.emergencyContactName}
                    onChangeText={(text) => handleFieldUpdate('emergencyContactName', text)}
                    placeholder="Enter contact name"
                  />
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Relationship</Text>
                  <TextInput
                    style={styles.input}
                    value={data.emergencyContactRelationship}
                    onChangeText={(text) => handleFieldUpdate('emergencyContactRelationship', text)}
                    placeholder="Enter relationship"
                  />
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={data.emergencyContactPhone}
                    onChangeText={(text) => handleFieldUpdate('emergencyContactPhone', text)}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={data.emergencyContactEmail}
                    onChangeText={(text) => handleFieldUpdate('emergencyContactEmail', text)}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setCurrentSection('accompanyingPersons')}
            >
              <Text style={styles.continueButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'accompanyingPersons':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Accompanying Persons</Text>
            <Text style={styles.sectionNote}>List any minor children or incapacitated/incompetent adults traveling with you</Text>
            <View style={styles.travelInfoGrid}>
              <View style={styles.travelInfoRow}>
                <View style={[styles.travelInfoField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Names and Ages</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    value={data.accompanyingPersons}
                    onChangeText={(text) => handleFieldUpdate('accompanyingPersons', text)}
                    placeholder="Enter names and ages of accompanying persons"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setShowSignature(true)}
            >
              <Text style={styles.continueButtonText}>Continue to Signature</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.sectionContainer}>
      {showSignature ? (
        <SignaturePage
          onSave={handleSignatureSave}
          onCancel={() => setShowSignature(false)}
        />
      ) : (
        renderSection()
      )}
    </View>
  );
};

const ScanResults = ({ parsedData }) => {
  if (!parsedData) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Document Information</Text>
      <View style={styles.resultContainer}>
        <ResultRow label="Document Type" value={parsedData.documentType} />
        <ResultRow label="Surname" value={parsedData.surname} />
        <ResultRow label="First Name" value={parsedData.firstName} />
        <ResultRow label="Middle Name" value={parsedData.middleName} />
        <ResultRow label="Passport Number" value={parsedData.documentNumber} />
        <ResultRow label="Nationality" value={parsedData.nationality} />
        <ResultRow label="Date of Birth" value={formatMRZDate(parsedData.dateOfBirth, false)} />
        <ResultRow label="Sex" value={parsedData.sex} />
        <ResultRow label="Expiry Date" value={formatMRZDate(parsedData.expiryDate, true)} />
        <ResultRow label="Issuing Country" value={parsedData.issuingCountry} />
      </View>

      {parsedData.travelInfo && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Travel Information</Text>
          <View style={styles.resultContainer}>
            <ResultRow label="Carrier" value={parsedData.travelInfo.carrier} />
            <ResultRow label="Routing" value={parsedData.travelInfo.routing} />
            <ResultRow label="Flight Number" value={parsedData.travelInfo.flightNumber} />
            <ResultRow label="Date of Flight" value={parsedData.travelInfo.dateOfFlight} />
            <ResultRow label="Seats" value={parsedData.travelInfo.seats} />
            <ResultRow label="Meal" value={parsedData.travelInfo.meal} />
            <ResultRow label="Assistance Request" value={parsedData.travelInfo.assistanceRequest} />
            <ResultRow label="Remarks" value={parsedData.travelInfo.remarks} />
          </View>
        </>
      )}
    </View>
  );
};

const ErrorDisplay = ({ error, rawData }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{error || 'Invalid MRZ data'}</Text>
    <Text style={styles.rawDataText}>Raw data: {rawData}</Text>
  </View>
);

const EventSelector = ({ visible, onClose, onSelectEvent, events, onCreateEvent }) => {
  const [newEventName, setNewEventName] = useState('');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    (event.name || event.eventName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleCreateEvent = () => {
    if (newEventName.trim()) {
      onCreateEvent(newEventName.trim());
      setNewEventName('');
      setShowCreateEvent(false);
      // Don't close the modal after creating an event
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Event</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Feather name="x" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
          
          {showCreateEvent ? (
            <View style={{padding: 16}}>
              <Text style={{fontSize: 16, fontWeight: '500', marginBottom: 8}}>Event Name</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D1D6',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#FFFFFF',
                  marginBottom: 16
                }}
                placeholder="Enter event name"
                value={newEventName}
                onChangeText={setNewEventName}
              />
              <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 12}}>
                <TouchableOpacity 
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: '#E0E0E0',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => setShowCreateEvent(false)}
                >
                  <Feather name="x-circle" size={16} color="#2C3E50" style={{marginRight: 8}} />
                  <Text style={{color: '#2C3E50', fontWeight: '500'}}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: '#103E7E',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={handleCreateEvent}
                >
                  <Feather name="check-circle" size={16} color="#FFFFFF" style={{marginRight: 8}} />
                  <Text style={{color: '#FFFFFF', fontWeight: '500'}}>Create Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Add Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Feather name="search" size={18} color="#8E8E93" style={{marginRight: 8}} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search events..."
                    placeholderTextColor="#8E8E93"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Feather name="x-circle" size={16} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <ScrollView style={styles.eventList}>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event, index) => (
                  <TouchableOpacity
                      key={index}
                    style={styles.eventItem}
                      onPress={() => onSelectEvent(event)}
                    >
                      <View style={{width: '100%'}}>
                        <View style={styles.eventItemHeader}>
                          <View style={styles.eventItemIcon}>
                            <Feather name="folder" size={18} color="#103E7E" />
                          </View>
                          <Text style={styles.eventName}>{event.name || event.eventName}</Text>
                          <Text style={{fontSize: 12, color: '#6B7280'}}>{event.scans.length} scans</Text>
                        </View>
                        <View style={styles.eventItemBody}>
                          <Text style={{fontSize: 13, color: '#64748B'}}>
                            Created: {new Date(event.createdAt).toLocaleDateString()} at {
                              new Date(event.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            }
                    </Text>
                        </View>
                      </View>
                  </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Feather name="search" size={36} color="#D1D1D6" />
                    <Text style={styles.noResultsText}>No matching events found</Text>
                    {searchQuery ? (
                      <Text style={styles.noResultsSubtext}>Try a different search term</Text>
                    ) : (
                      <Text style={styles.noResultsSubtext}>Create an event to get started</Text>
                    )}
                  </View>
                )}
              </ScrollView>
              <View style={{padding: 16, borderTopWidth: 1, borderTopColor: '#D1D1D6'}}>
              <TouchableOpacity
                  style={{
                    backgroundColor: '#103E7E',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={() => setShowCreateEvent(true)}
                >
                  <Feather name="plus-circle" size={18} color="#FFFFFF" style={{marginRight: 8}} />
                  <Text style={{color: '#FFFFFF', fontWeight: '500', fontSize: 16}}>Create New Event</Text>
              </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const ScanDetails = ({ scan, onBack }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const isTablet = SCREEN_WIDTH >= 768;

  // Helper for rendering a row with icon, label, and value
  const InfoRow = ({ icon, iconColor, label, value }) => (
    <View style={scanDetailsStyles.infoRow}>
      <Feather name={icon} size={isTablet ? 22 : 18} color={iconColor} style={scanDetailsStyles.infoIcon} />
      <Text style={scanDetailsStyles.infoLabel}>{label}</Text>
      <Text style={scanDetailsStyles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );

  // Add a function to handle the Generate PDF button click
  const handleGeneratePDFClick = () => {
    setShowConsentModal(true);
  };

  // Add a function to generate the PDF after consent
  const generatePDFWithConsent = async () => {
    setShowConsentModal(false);
    setIsGeneratingPDF(true);
    try { 
      await generateFormPDF(scan); 
    } catch (e) { 
      Alert.alert('Error', e.message); 
    }
    setIsGeneratingPDF(false);
  };

  // Helper for rendering a section with a grid
  const InfoSection = ({ title, data }) => (
    <View style={scanDetailsStyles.sectionCard}>
      <Text style={scanDetailsStyles.sectionHeader}>{title}</Text>
      <View style={scanDetailsStyles.grid}>
        {data.map((item, idx) => (
          <View key={idx} style={scanDetailsStyles.gridItem}>
            <InfoRow {...item} />
          </View>
        ))}
      </View>
    </View>
  );

  // Prepare data for each section
  const docInfo = [
    { icon: 'file-text', iconColor: '#0A84FF', label: 'Document Type', value: scan.documentType },
    { icon: 'user', iconColor: '#FF9500', label: 'Surname', value: scan.surname },
    { icon: 'user', iconColor: '#FF9500', label: 'First Name', value: scan.firstName },
    { icon: 'user', iconColor: '#FF9500', label: 'Middle Name', value: scan.middleName },
    { icon: 'hash', iconColor: '#34C759', label: 'Passport Number', value: scan.documentNumber },
    { icon: 'flag', iconColor: '#FF2D55', label: 'Nationality', value: scan.nationality },
    { icon: 'calendar', iconColor: '#5856D6', label: 'Date of Birth', value: formatMRZDate(scan.dateOfBirth, false) },
    { icon: 'user', iconColor: '#FF9500', label: 'Sex', value: scan.sex },
    { icon: 'calendar', iconColor: '#5856D6', label: 'Expiry Date', value: formatMRZDate(scan.expiryDate, true) },
    { icon: 'globe', iconColor: '#FF2D55', label: 'Issuing Country', value: scan.issuingCountry },
  ];
  const travelInfo = [
    { icon: 'navigation', iconColor: '#0A84FF', label: 'Carrier', value: scan.carrier },
    { icon: 'map', iconColor: '#34C759', label: 'Routing', value: scan.routing },
    { icon: 'hash', iconColor: '#FF9500', label: 'Flight Number', value: scan.flightNumber },
    { icon: 'calendar', iconColor: '#5856D6', label: 'Date of Flight', value: scan.dateOfFlight },
    { icon: 'pocket', iconColor: '#FF2D55', label: 'Seats', value: scan.seats },
    { icon: 'coffee', iconColor: '#8E8E93', label: 'Meal', value: scan.meal },
  ];
  const personalInfo = [
    { icon: 'map-pin', iconColor: '#FF9500', label: 'Place of Birth (City)', value: scan.birthCity },
    { icon: 'map', iconColor: '#34C759', label: 'State/Province', value: scan.birthState },
    { icon: 'globe', iconColor: '#FF2D55', label: 'Country', value: scan.birthCountry },
    { icon: 'shield', iconColor: '#5856D6', label: 'Social Security Number', value: scan.ssn },
  ];
  const lodgingInfo = [
    { icon: 'home', iconColor: '#0A84FF', label: 'Current Lodging', value: scan.currentLodging },
    { icon: 'phone', iconColor: '#34C759', label: 'Phone Number', value: scan.phoneNumber },
    { icon: 'mail', iconColor: '#FF9500', label: 'Email', value: scan.email },
  ];
  // Emergency Contact Section
  const emergencyInfo = [
    { icon: 'user', iconColor: '#FF9500', label: 'Last Name', value: scan.emergencyLastName },
    { icon: 'user', iconColor: '#FF9500', label: 'First Name', value: scan.emergencyFirstName },
    { icon: 'map-pin', iconColor: '#34C759', label: 'Address Line 1', value: scan.emergencyAddress1 },
    { icon: 'map-pin', iconColor: '#34C759', label: 'Address Line 2', value: scan.emergencyAddress2 },
    { icon: 'map', iconColor: '#5856D6', label: 'City', value: scan.emergencyCity },
    { icon: 'map', iconColor: '#5856D6', label: 'State/Province', value: scan.emergencyState },
    { icon: 'globe', iconColor: '#FF2D55', label: 'Country', value: scan.emergencyCountry },
    { icon: 'phone', iconColor: '#34C759', label: 'Phone', value: scan.emergencyPhone },
    { icon: 'mail', iconColor: '#FF9500', label: 'Email', value: scan.emergencyEmail },
  ];
  // Billing Information Section
  const billingInfo = [
    { icon: 'map-pin', iconColor: '#34C759', label: 'Address Line 1', value: scan.billingAddress1 },
    { icon: 'map-pin', iconColor: '#34C759', label: 'Address Line 2', value: scan.billingAddress2 },
    { icon: 'map', iconColor: '#5856D6', label: 'City', value: scan.billingCity },
    { icon: 'globe', iconColor: '#FF2D55', label: 'Country', value: scan.billingCountry },
    { icon: 'hash', iconColor: '#FF9500', label: 'Postal Code', value: scan.billingPostalCode },
    { icon: 'phone', iconColor: '#34C759', label: 'Phone', value: scan.billingPhone },
    { icon: 'mail', iconColor: '#FF9500', label: 'Email', value: scan.billingEmail },
  ];
  // Medical Condition Section
  const medicalInfo = [
    { icon: 'activity', iconColor: '#FF2D55', label: 'Medical Condition, current injuries, or limited mobility relevant to evacuation', value: scan.medicalConditions },
  ];
  // Accompanying Persons Section
  const accompanyingInfo = [
    { icon: 'users', iconColor: '#007AFF', label: 'Accompanying Persons', value: scan.accompanyingPersons },
  ];

  return (
    <SafeAreaView style={scanDetailsStyles.container}>
      <View style={scanDetailsStyles.header}>
        <TouchableOpacity style={scanDetailsStyles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={isTablet ? 24 : 20} color="#FFFFFF" />
          <Text style={scanDetailsStyles.backButtonLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={scanDetailsStyles.title}>{scan.label || 'Scan Details'}</Text>
                <TouchableOpacity
          style={[scanDetailsStyles.pdfButton, isGeneratingPDF && scanDetailsStyles.pdfButtonDisabled]}
          onPress={handleGeneratePDFClick}
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? 
            <ActivityIndicator size="small" color="#fff" /> : 
            <>
              <Feather name="file-text" size={isTablet ? 18 : 16} color="#FFFFFF" />
              <Text style={scanDetailsStyles.pdfButtonText}>Generate PDF</Text>
            </>
          }
                </TouchableOpacity>
      </View>
      
      {/* Consent Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConsentModal}
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={scanDetailsStyles.consentModalOverlay}>
          <View style={scanDetailsStyles.consentModalContent}>
            <View style={scanDetailsStyles.consentModalHeader}>
              <Text style={scanDetailsStyles.consentModalTitle}>IMPORTANT NOTICE</Text>
            </View>
            <View style={scanDetailsStyles.consentModalBody}>
              <Feather name="alert-triangle" size={40} color="#942926" style={{alignSelf: 'center', marginBottom: 16}} />
              <Text style={scanDetailsStyles.consentModalText}>
                BY GENERATING THE DS-3072 FORM, YOU ARE AGREEING TO PAY BACK EXPENSES INCURRED BY THE US GOVT. TO ENSURE SAFE EVACUATION
              </Text>
            </View>
            <View style={scanDetailsStyles.consentModalFooter}>
                <TouchableOpacity
                style={scanDetailsStyles.consentModalButtonCancel}
                onPress={() => setShowConsentModal(false)}
              >
                <Text style={scanDetailsStyles.consentModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={scanDetailsStyles.consentModalButtonAgree}
                onPress={generatePDFWithConsent}
              >
                <Text style={scanDetailsStyles.consentModalButtonAgreeText}>I Agree</Text>
                </TouchableOpacity>
              </View>
          </View>
        </View>
      </Modal>
      
      <ScrollView style={scanDetailsStyles.scrollView}>
        <View style={scanDetailsStyles.content}>
          <View style={scanDetailsStyles.confidenceRow}>
            {scan.confidence && (
              <View style={scanDetailsStyles.confidenceTag}>
                <Text style={scanDetailsStyles.confidenceText}>Confidence: {Math.round(scan.confidence)}%</Text>
            </View>
          )}
          </View>
          <InfoSection title="Document Information" data={docInfo} />
          <InfoSection title="Travel Information" data={travelInfo} />
          <InfoSection title="Personal Information" data={personalInfo} />
          <InfoSection title="Current Lodging" data={lodgingInfo} />
          <InfoSection title="Emergency Contact" data={emergencyInfo} />
          <InfoSection title="Billing Information" data={billingInfo} />
          <InfoSection title="Medical Condition" data={medicalInfo} />
          <InfoSection title="Accompanying Persons" data={accompanyingInfo} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles for ScanDetails ---
const scanDetailsStyles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F2F5' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: '#103E7E', // Government blue
    borderBottomWidth: 4, 
    borderBottomColor: '#8F9CB3' // Lighter blue-grey border
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  backButtonLabel: { 
    fontSize: isTablet ? 18 : 16, 
    color: '#FFFFFF', 
    fontWeight: '500', 
    marginLeft: 6 
  },
  title: { 
    fontSize: isTablet ? 22 : 18, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  pdfButton: { 
    backgroundColor: '#2C3E50', // Darker blue for secondary actions
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8, 
    minWidth: 100, 
    alignItems: 'center',
    flexDirection: 'row'
  },
  pdfButtonDisabled: { 
    backgroundColor: '#8E8E93' 
  },
  pdfButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600',
    marginLeft: 8
  },
  scrollView: { 
    flex: 1, 
    backgroundColor: '#F0F2F5' 
  },
  content: { 
    padding: isTablet ? 24 : 16 
  },
  confidenceRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginBottom: 12 
  },
  confidenceTag: { 
    backgroundColor: '#2C3E50', // Darker blue for tags
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 4 // Less rounded
  },
  confidenceText: { 
    color: '#fff', 
    fontSize: isTablet ? 15 : 13, 
    fontWeight: '600' 
  },
  sectionCard: { 
    backgroundColor: '#fff', 
    borderRadius: 8, // Less rounded
    padding: isTablet ? 20 : 14, 
    marginBottom: isTablet ? 20 : 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 2, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D1D1D6'
  },
  sectionHeader: { 
    fontSize: isTablet ? 18 : 16, 
    fontWeight: '600', 
    color: '#1C2833', 
    marginBottom: isTablet ? 16 : 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB', 
    paddingBottom: 6 
  },
  grid: { 
    flexDirection: 'column',
    flexWrap: 'nowrap'
  },
  gridItem: { 
    width: '100%',
    paddingRight: 0,
    marginBottom: 10 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  infoIcon: { 
    marginRight: 10,
    color: '#103E7E' // Government blue
  },
  infoLabel: { 
    flex: 1, 
    color: '#566573', 
    fontSize: isTablet ? 15 : 13
  },
  infoValue: { 
    flex: 1.2, 
    color: '#1C2833', 
    fontWeight: '600', 
    fontSize: isTablet ? 15 : 13, 
    textAlign: 'right' 
  },
  consentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consentModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    maxWidth: isTablet ? 500 : 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  consentModalHeader: {
    backgroundColor: '#103E7E',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0C3263',
  },
  consentModalTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  consentModalBody: {
    padding: 20,
  },
  consentModalText: {
    fontSize: isTablet ? 16 : 14,
    lineHeight: isTablet ? 24 : 22,
    color: '#1C2833',
    textAlign: 'center',
    fontWeight: '600',
  },
  consentModalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#D1D1D6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  consentModalButtonCancel: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  consentModalButtonCancelText: {
    color: '#2C3E50',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  consentModalButtonAgree: {
    backgroundColor: '#103E7E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  consentModalButtonAgreeText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
});

const EventDetails = ({ event, onBack, onViewScan }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScans, setSelectedScans] = useState({});
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  
  useEffect(() => {
    if (event && event.scans) {
      setScans(event.scans);
      setLoading(false);
    }
  }, [event]);
  
  useEffect(() => {
    // Update selectAll checkbox state based on selected scans
    if (scans.length > 0 && Object.keys(selectedScans).length === scans.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedScans, scans]);
  
  const toggleScanSelection = (scanId) => {
    setSelectedScans(prev => {
      const newSelected = { ...prev };
      if (newSelected[scanId]) {
        delete newSelected[scanId];
      } else {
        newSelected[scanId] = true;
      }
      return newSelected;
    });
  };
  
  const handleSelectAll = () => {
    if (selectAll) {
      // Unselect all
      setSelectedScans({});
    } else {
      // Select all
      const allSelected = {};
      scans.forEach(scan => {
        allSelected[scan.id] = true;
      });
      setSelectedScans(allSelected);
    }
    setSelectAll(!selectAll);
  };
  
  const exportSelectedScans = async () => {
    const selectedScanIds = Object.keys(selectedScans);
    if (selectedScanIds.length === 0) {
      Alert.alert('Error', 'Please select at least one scan to export');
      return;
    }
    
    setExportLoading(true);
    try {
      const selectedScanData = scans.filter(scan => selectedScans[scan.id]);
      const csvContent = generateCSV(selectedScanData);
      
      const fileDate = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const fileName = `${event.eventName || event.name || 'Event'}_export_${fileDate}.csv`;
      
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      try {
        // Move sharing to a separate try-catch to prevent it from affecting export success status
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${selectedScanIds.length} scans from ${event.eventName || event.name || 'Event'}`,
        });
        
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (hapticErr) {
          // Ignore haptic errors, they shouldn't affect the success of the export
          console.log('Haptic feedback not available:', hapticErr);
        }
        
        Alert.alert('Success', `${selectedScanIds.length} scans exported successfully`);
      } catch (shareErr) {
        console.warn('Sharing error:', shareErr);
        // If sharing fails but file was created, still consider it a success
        Alert.alert('Export Successful', 
          `CSV file created at: ${fileUri}\n\nSharing not available: ${shareErr.message}`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export scans: ' + err.message);
      Alert.alert('Export Error', `Failed to create CSV file: ${err.message}`);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (hapticErr) {
        // Ignore haptic errors
      }
    } finally {
      setExportLoading(false);
    }
  };
  
  const generateCSV = (scansData) => {
    // Header row with added flight information
    let csv = 'Document Type,Document Number,Last Name,First Name,Nationality,DOB,Sex,Expiry Date,Scan Date,Carrier,Routing,Flight Number,Date of Flight,Seats,Meal\n';
    
    // Data rows
    scansData.forEach(scan => {
      const row = [
        scan.documentType || 'N/A',
        scan.documentNumber || 'N/A',
        scan.surname || scan.lastName || 'N/A',
        scan.firstName || 'N/A',
        scan.nationality || 'N/A',
        formatMRZDate(scan.dateOfBirth, false) || scan.birthDate || 'N/A',
        scan.sex || 'N/A',
        formatMRZDate(scan.expiryDate, true) || scan.expiryDate || 'N/A',
        new Date(scan.createdAt || scan.savedAt).toLocaleDateString() || 'N/A',
        // Add flight information
        scan.carrier || 'N/A',
        scan.routing || 'N/A',
        scan.flightNumber || 'N/A',
        scan.dateOfFlight || 'N/A',
        scan.seats || 'N/A',
        scan.meal || 'N/A'
      ];
      
      // Handle commas and quotes in the data
      const escapedRow = row.map(field => {
        // If field contains comma, quote, or newline, enclose in quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          // Replace quotes with double quotes
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      });
      
      csv += escapedRow.join(',') + '\n';
    });
    
    return csv;
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5'}}>
        <ActivityIndicator size="large" color="#103E7E" />
      </View>
    );
  }
  
  return (
    <View style={{flex: 1, backgroundColor: '#F0F2F5'}}>
      <View style={styles.eventDetailHeader}>
        <TouchableOpacity onPress={onBack} style={{marginRight: 16}}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.eventDetailTitle}>{event.eventName}</Text>
        <Text style={{color: '#FFFFFF', fontSize: 14}}>{scans.length} Scans</Text>
      </View>
      
      <ScrollView contentContainerStyle={{paddingBottom: 20}}>
        <View style={styles.eventDetailSection}>
          <View style={styles.eventDetailSectionHeader}>
            <Text style={styles.eventDetailSectionTitle}>Scanned Documents</Text>
          <TouchableOpacity
              style={{flexDirection: 'row', alignItems: 'center'}} 
              onPress={handleSelectAll}
            >
              <View style={{
                width: 20, 
                height: 20, 
                borderWidth: 2,
                borderColor: '#103E7E',
                borderRadius: 4,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: selectAll ? '#103E7E' : 'transparent',
                marginRight: 8
              }}>
                {selectAll && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
              <Text style={{color: '#103E7E', fontWeight: '500'}}>Select All</Text>
          </TouchableOpacity>
        </View>
          
          {scans.length === 0 ? (
            <View style={{padding: 20, alignItems: 'center'}}>
              <Feather name="file-text" size={40} color="#D1D1D6" />
              <Text style={{marginTop: 8, color: '#64748B', fontSize: 16, textAlign: 'center'}}>
                No scans found in this event
              </Text>
      </View>
          ) : (
            scans.map((scan, index) => (
              <View key={index} style={styles.scanCard}>
                <View style={styles.scanCardHeader}>
                  <TouchableOpacity 
                    style={{
                      width: 22, 
                      height: 22, 
                      borderWidth: 2,
                      borderColor: '#103E7E',
                      borderRadius: 4,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: selectedScans[scan.id] ? '#103E7E' : 'transparent',
                    }}
                    onPress={() => toggleScanSelection(scan.id)}
                  >
                    {selectedScans[scan.id] && <Feather name="check" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={styles.scanCardTitle}>
                    {scan.documentType || 'Document'} - {scan.surname || ''} {scan.firstName || ''}
                  </Text>
                  <Text style={styles.scanCardDate}>
                    {scan.createdAt ? 
                      new Date(scan.createdAt).toLocaleDateString() : 
                      scan.savedAt ? 
                        new Date(scan.savedAt).toLocaleDateString() : 
                        ''}
                  </Text>
                </View>
                
                <View style={styles.scanDetailRow}>
                  <Text style={styles.scanDetailLabel}>Full Name:</Text>
                  <Text style={styles.scanDetailValue}>
                    {(scan.surname || scan.lastName) ? 
                      `${scan.surname || scan.lastName}${(scan.firstName) ? `, ${scan.firstName}` : ''}` : 
                      'Not available'}
                  </Text>
                </View>
                
                <View style={styles.scanDetailRow}>
                  <Text style={styles.scanDetailLabel}>Nationality:</Text>
                  <Text style={styles.scanDetailValue}>
                    {scan.nationality || 'Not available'}
                  </Text>
                </View>
                
                <View style={styles.scanDetailRow}>
                  <Text style={styles.scanDetailLabel}>Document Info:</Text>
                  <Text style={styles.scanDetailValue}>
                    {scan.sex ? `${scan.sex} • ` : ''}
                    {(scan.birthDate || scan.dateOfBirth) ? 
                      `DOB: ${scan.birthDate && scan.birthDate.length === 6 ? 
                          formatMRZDate(scan.birthDate, false) : 
                          scan.birthDate || 
                          (scan.dateOfBirth && scan.dateOfBirth.length === 6 ? 
                            formatMRZDate(scan.dateOfBirth, false) : '')} • ` : 
                      ''}
                    {(scan.expiryDate && scan.expiryDate.length === 6) ? 
                      `Expires: ${formatMRZDate(scan.expiryDate, true)}` : 
                      (scan.expiryDate) ? 
                        `Expires: ${scan.expiryDate}` : 
                        (scan.dateOfExpiry && scan.dateOfExpiry.length === 6) ? 
                          `Expires: ${formatMRZDate(scan.dateOfExpiry, true)}` : 
                          ''}
                    {(!scan.sex && !scan.birthDate && !scan.dateOfBirth && 
                     !scan.expiryDate && !scan.dateOfExpiry) ? 'Not available' : ''}
                  </Text>
                </View>

          <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    marginTop: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 4,
                    backgroundColor: '#F0F2F5',
                    borderWidth: 1,
                    borderColor: '#D1D1D6'
                  }}
                  onPress={() => onViewScan(scan)}
          >
                  <Text style={{color: '#103E7E', fontWeight: '500', fontSize: 13}}>
                    View Details
                  </Text>
          </TouchableOpacity>
        </View>
            ))
          )}
      </View>
        
        <TouchableOpacity 
          style={[
            styles.exportButton, 
            Object.keys(selectedScans).length === 0 ? styles.exportButtonDisabled : null
          ]}
          onPress={exportSelectedScans}
          disabled={Object.keys(selectedScans).length === 0 || exportLoading}
        >
          {exportLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="download" size={18} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>
                Export {Object.keys(selectedScans).length > 0 ? Object.keys(selectedScans).length : ''} Selected Scans
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showEvents, setShowEvents] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const SCAN_BUFFER_SIZE = 5;
  const REQUIRED_MATCHING_SCANS = 3;

  const {
    events: dbEvents,
    scans,
    loading,
    loadEvents,
    loadScans,
    addScan,
    getEventDetails,
    createEvent,
    updateEvent,
    addEvent
  } = useDatabase();

  // Helper function to find the most frequent result
  const findMostFrequentResult = (scans) => {
    const counts = {};
    let maxCount = 0;
    let mostFrequent = null;
    
    scans.forEach(scan => {
      if (!counts[scan.text]) {
        counts[scan.text] = {
          count: 0,
          confidence: 0
        };
      }
      
      counts[scan.text].count++;
      counts[scan.text].confidence = Math.max(counts[scan.text].confidence, scan.confidence);
      
      if (counts[scan.text].count > maxCount) {
        maxCount = counts[scan.text].count;
        mostFrequent = {
          text: scan.text,
          count: counts[scan.text].count,
          confidence: counts[scan.text].confidence
        };
      }
    });
    
    return mostFrequent;
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      setRecentScans([]);
      
      const recognizer = new MRZRecognizer();
      await recognizer.startScanning();
      
      recognizer.onImageRead = async (results) => {
        if (!scanning) return;
        
        if (results.length > 0) {
          const mrzResult = results[0];
          
          if (mrzResult.lineResults && mrzResult.lineResults.length > 0) {
            const lines = mrzResult.lineResults
              .map(line => line.text)
              .filter(text => text && typeof text === 'string')
              .map(text => text.replace(/\s/g, '').toUpperCase());
            
            if (lines.length >= 2) {
              const newScan = {
                text: lines.join('\n'),
                confidence: mrzResult.confidence
              };
              
              setRecentScans(prevScans => {
                const updatedScans = [...prevScans, newScan].slice(-SCAN_BUFFER_SIZE);
                
                // Analyze the recent scans for consensus
                const mostFrequentResult = findMostFrequentResult(updatedScans);
                
                if (mostFrequentResult && mostFrequentResult.count >= REQUIRED_MATCHING_SCANS) {
                  // We have a consensus, accept this result
                  setScanning(false);
                  recognizer.stopScanning();
                  
                  // Process the result
                  const result = {
                    text: mostFrequentResult.text,
                    confidence: mostFrequentResult.confidence,
                    timestamp: new Date().toISOString()
                  };
                  
                  setScanResult(result);
                  // Update events through the database hook
                  addScan(result);
                }
                
                return updatedScans;
              });
            }
          }
        }
      };
    } catch (error) {
      console.error('Error starting scan:', error);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    setScanning(false);
    setRecentScans([]);
  };

  const clearEvents = () => {
    // Use the database hook to clear events
    deleteAllData();
    loadEvents();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const [showScanner, setShowScanner] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showScans, setShowScans] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewingScan, setViewingScan] = useState(null); // Add this state variable
  const [error, setError] = useState(null);
  const [scanLabel, setScanLabel] = useState('');
  const [expandedScanId, setExpandedScanId] = useState(null);
  const [travelInfo, setTravelInfo] = useState({
    carrier: '',
    routing: '',
    flightNumber: '',
    dateOfFlight: '',
    seats: '',
    meal: '',
    birthCity: '',
    birthState: '',
    birthCountry: '',
    ssn: '',
    currentLodging: '',  // where you may be contacted now
    phoneNumber: '',     // where you may be contacted now
    email: '',          // where you may be contacted now
    emergencyLastName: '',
    emergencyFirstName: '',
    emergencyAddress1: '',
    emergencyAddress2: '',
    emergencyCity: '',
    emergencyState: '',
    emergencyCountry: '',
    emergencyPhone: '',
    emergencyEmail: '',
    accompanyingPersons: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingCountry: '',
    billingPostalCode: '',
    billingPhone: '',
    billingEmail: '',
    medicalConditions: '', // Medical Condition, current injuries, or limited mobility relevant to evacuation
    remarks: ''
  });
  const [signature, setSignature] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animation value

  useEffect(() => {
    // Fade-in animation for the header
    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 800, // Adjust duration as needed
        useNativeDriver: true, // Use native driver for performance
      }
    ).start();

    // Run database migration when the app loads
    const runMigration = async () => {
      try {
        console.log('Running database migration...');
        await migrateDatabase();
        console.log('Database migration complete');
      } catch (error) {
        console.error('Error running migration:', error);
      }
    };
    
    runMigration();
    loadEvents();
    loadScans();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    console.log('Travel info updated:', travelInfo);
  }, [travelInfo]);

  const handleScan = async (scanData) => {
    try {
      const parsedData = parseMRZ(scanData.mrzText);
      
      if (!parsedData) {
        throw new Error('Failed to parse MRZ data');
      }
      
      // Initialize travel info
      const initialTravelInfo = {
        carrier: '',
        routing: '',
        flightNumber: '',
        dateOfFlight: '',
        seats: '',
        meal: '',
        birthCity: '',
        birthState: '',
        birthCountry: '',
        ssn: '',
        currentLodging: '',
        phoneNumber: '',
        email: '',
        emergencyLastName: '',
        emergencyFirstName: '',
        emergencyAddress1: '',
        emergencyAddress2: '',
        emergencyCity: '',
        emergencyState: '',
        emergencyCountry: '',
        emergencyPhone: '',
        emergencyEmail: '',
        accompanyingPersons: '',
        billingAddress1: '',
        billingAddress2: '',
        billingCity: '',
        billingCountry: '',
        billingPostalCode: '',
        billingPhone: '',
        billingEmail: '',
        medicalConditions: '',
        remarks: ''
      };

      setLastScan({
        ...parsedData,
        rawData: scanData.mrzText,
        confidence: scanData.confidence,
        timestamp: new Date().toISOString(),
        travelInfo: initialTravelInfo
      });

      // Initialize the travelInfo state
      setTravelInfo(initialTravelInfo);
      
      // If we have a selected event, we'll automatically save to it later
      setShowScanner(false);
    } catch (error) {
      console.error('Error handling scan:', error);
      setError('Failed to process scan data: ' + error.message);
    }
  };

  const handleSaveScan = async () => {
    try {
      if (!lastScan) {
        Alert.alert('Error', 'No scan data available');
        return;
      }

      // Create a default label if none provided
      const finalLabel = scanLabel.trim() || 
        `${lastScan.firstName || ''} ${lastScan.surname || ''} - ${lastScan.documentNumber || 'No ID'}`;

      // If we have a selected event, save directly to it
      if (selectedEvent) {
        await handleSaveToEvent(selectedEvent);
        // Show event details again
        setShowEventDetails(true);
      } else {
        // Original save logic for standalone scans
        const { travelInfo: _, ...mrzData } = lastScan;
        const scanToSave = {
          ...mrzData,
          label: finalLabel,
          savedAt: new Date().toISOString(),
        };
        
        console.log('Saving scan with label:', finalLabel);
        const scanId = await insertScan(scanToSave);
        console.log('Scan saved with ID:', scanId);
        
        // Reset states
      setLastScan(null);
        setScanLabel('');
        setTravelInfo({/* ... initial state ... */});
        setSignature(null);
        
        Alert.alert('Success', 'Scan saved successfully');
      }
      
      setShowScanner(false);
    } catch (error) {
      console.error('Error saving scan:', error);
      Alert.alert('Error', 'Failed to save scan: ' + error.message);
    }
  };

  const handleCreateEvent = async (eventName) => {
    try {
      // Create a new event with proper fields
      const newEvent = {
        name: eventName,
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scans: [] // Start with empty scans array
      };

      // Save the event to the database using addEvent from useDatabase hook
      await addEvent(newEvent);
      
      // Reload events to update the list
      await loadEvents();
      
      // If we have a scan waiting to be saved, continue with that flow
      if (lastScan) {
        // Select the newly created event
        const createdEvent = dbEvents.find(e => e.name === eventName);
        if (createdEvent) {
          handleSaveToEvent(createdEvent);
          // Now can close the events screen since the scan is saved
      setShowEvents(false);
        }
      }
      // If we're just creating an event, stay on the events screen
      // No need to close the modal or do anything else
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event: ' + error.message);
    }
  };

  const handleEventClick = async (event) => {
    // If no event is provided, just close the modal
    if (!event) {
    setShowEvents(false);
      return;
    }

    try {
      // Get fresh event data from the database
      const eventWithScans = await getEventWithScans(event.id);
      if (!eventWithScans) {
        console.log('Event not found in database:', event.id);
      setShowEvents(false);
        return;
      }

      console.log('Loading event details:', eventWithScans);

      // Set the selected event with fresh data
      setSelectedEvent(eventWithScans);
      
      // Close the event selector modal
      setShowEvents(false);
      
      // Show the event details view
      setShowEventDetails(true);

      // Get travel info from the first scan if it exists
      const firstScan = eventWithScans.scans?.[0];
      if (firstScan?.travelInfo) {
        setTravelInfo(firstScan.travelInfo);
      } else {
        // Reset travel info if no scan data
        setTravelInfo({
          carrier: '',
          routing: '',
          flightNumber: '',
          dateOfFlight: '',
          seats: '',
          meal: '',
          assistanceRequest: '',
          remarks: ''
        });
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      // Just close the modal instead of showing an error
      setShowEvents(false);
    }
  };

  const handleSaveToEvent = async (event) => {
    try {
      if (!lastScan) {
        Alert.alert('Error', 'No scan data available');
        return;
      }

      // Create a default label if none provided
      const finalLabel = scanLabel.trim() || 
        `${lastScan.firstName || ''} ${lastScan.surname || ''} - ${lastScan.documentNumber || 'No ID'}`;

      // Create the scan object with all fields
      const { travelInfo: _, ...mrzData } = lastScan;
      const scanToSave = {
        ...mrzData,
        label: finalLabel,
        savedAt: new Date().toISOString(),
        eventId: event.id,
        
        // Document Information
        documentType: mrzData.documentType || null,
        surname: mrzData.surname || null,
        firstName: mrzData.firstName || null,
        middleName: mrzData.middleName || null,
        documentNumber: mrzData.documentNumber || null,
        nationality: mrzData.nationality || null,
        dateOfBirth: mrzData.dateOfBirth || null,
        sex: mrzData.sex || null,
        expiryDate: mrzData.expiryDate || null,
        issuingCountry: mrzData.issuingCountry || null,

        // Travel Information
        carrier: travelInfo.carrier || null,
        routing: travelInfo.routing || null,
        flightNumber: travelInfo.flightNumber || null,
        dateOfFlight: travelInfo.dateOfFlight || null,
        seats: travelInfo.seats || null,
        meal: travelInfo.meal || null,
        
        // Personal Information
        birthCity: travelInfo.birthCity || null,
        birthState: travelInfo.birthState || null,
        birthCountry: travelInfo.birthCountry || null,
        ssn: travelInfo.ssn || null,
        
        // Current Lodging
        currentLodging: travelInfo.currentLodging || null,
        phoneNumber: travelInfo.phoneNumber || null,
        email: travelInfo.email || null,
        
        // Medical Condition
        medicalConditions: travelInfo.medicalConditions || null,
        
        // Emergency Contact
        emergencyLastName: travelInfo.emergencyLastName || null,
        emergencyFirstName: travelInfo.emergencyFirstName || null,
        emergencyAddress1: travelInfo.emergencyAddress1 || null,
        emergencyAddress2: travelInfo.emergencyAddress2 || null,
        emergencyCity: travelInfo.emergencyCity || null,
        emergencyState: travelInfo.emergencyState || null,
        emergencyCountry: travelInfo.emergencyCountry || null,
        emergencyPhone: travelInfo.emergencyPhone || null,
        emergencyEmail: travelInfo.emergencyEmail || null,
        
        // Billing Information
        billingAddress1: travelInfo.billingAddress1 || null,
        billingAddress2: travelInfo.billingAddress2 || null,
        billingCity: travelInfo.billingCity || null,
        billingCountry: travelInfo.billingCountry || null,
        billingPostalCode: travelInfo.billingPostalCode || null,
        billingPhone: travelInfo.billingPhone || null,
        billingEmail: travelInfo.billingEmail || null,
        
        // Additional Information
        accompanyingPersons: travelInfo.accompanyingPersons || null,
        remarks: travelInfo.remarks || null,
        signature: signature || null
      };

      console.log('Saving scan to event with label:', finalLabel);
      const scanId = await insertScan(scanToSave);
      console.log('Scan saved with ID:', scanId);
      
      // Reset states
      setLastScan(null);
      setScanLabel('');
      setTravelInfo({
        carrier: '',
        routing: '',
        flightNumber: '',
        dateOfFlight: '',
        seats: '',
        meal: '',
        birthCity: '',
        birthState: '',
        birthCountry: '',
        ssn: '',
        currentLodging: '',
        phoneNumber: '',
        email: '',
        emergencyLastName: '',
        emergencyFirstName: '',
        emergencyAddress1: '',
        emergencyAddress2: '',
        emergencyCity: '',
        emergencyState: '',
        emergencyCountry: '',
        emergencyPhone: '',
        emergencyEmail: '',
        accompanyingPersons: '',
        billingAddress1: '',
        billingAddress2: '',
        billingCity: '',
        billingCountry: '',
        billingPostalCode: '',
        billingPhone: '',
        billingEmail: '',
        medicalConditions: '',
        remarks: ''
      });
      setSignature(null);
      setShowEvents(false); // Close the events modal
      
      Alert.alert('Success', 'Scan saved to event successfully');
      await loadEvents(); // Reload events to update the list
    } catch (error) {
      console.error('Error saving to event:', error);
      Alert.alert('Error', 'Failed to save scan to event: ' + error.message);
    }
  };

  const updateTravelInfo = (newTravelInfo) => {
    console.log("Travel info updated:", newTravelInfo);
    setTravelInfo(newTravelInfo);
    // Removing the problematic database update that runs on every keystroke
    // if (selectedEvent) {
    //   updateEvent(selectedEvent.id, { ...selectedEvent, travelInfo: newTravelInfo });
    // }
  };

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all events and scans? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllData();
              await loadEvents();
              await loadScans();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data: ' + error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {showScanner ? (
        <MRZScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      ) : showEvents ? (
        <EventSelector
          visible={true}
          onClose={() => setShowEvents(false)}
          onSelectEvent={lastScan ? handleSaveToEvent : handleEventClick}
          events={dbEvents}
          onCreateEvent={handleCreateEvent}
        />
      ) : showEventDetails && selectedEvent ? (
        <EventDetails
          event={selectedEvent}
          onBack={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
          onViewScan={(scan) => {
            setViewingScan(scan); // Set the viewingScan state
            setShowEventDetails(false); // Hide event details
          }}
        />
      ) : viewingScan ? ( // 3. Add a condition to render ScanDetails when viewingScan is true
        <ScanDetails 
          scan={viewingScan} 
          onBack={() => {
            setViewingScan(null); // Clear viewingScan state
            setShowEventDetails(true); // Show event details screen again
          }} 
        />
      ) : showScans ? (
        <SafeAreaView style={styles.container}>
          <View style={styles.reviewHeader}>
              <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowScans(false)}
            >
              <Text style={styles.backButtonText}>←</Text>
              <Text style={styles.backButtonLabel}>Back</Text>
              </TouchableOpacity>
            <Text style={styles.reviewTitle}>Saved Scans</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.reviewScrollView}>
            <View style={styles.reviewContent}>
              {scans && scans.length > 0 ? (
                scans.map((scan) => (
                  <View key={scan.id} style={[styles.reviewCard, { marginBottom: 16 }]}>
                    <View style={styles.reviewSectionHeader}>
                      <Text style={styles.scanDate}>
                        {new Date(scan.savedAt).toLocaleString()}
                      </Text>
                      {scan.confidence && (
                        <View style={styles.confidenceTag}>
                          <Text style={styles.confidenceText}>
                            Confidence: {Math.round(scan.confidence)}%
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Document Information */}
                    <View style={styles.scanSection}>
                      <Text style={styles.scanSectionTitle}>Document Information</Text>
                      <ResultRow label="Document Type" value={scan.documentType} />
                      <ResultRow label="Surname" value={scan.surname} />
                      <ResultRow label="First Name" value={scan.firstName} />
                      <ResultRow label="Passport Number" value={scan.documentNumber} />
                      <ResultRow label="Nationality" value={scan.nationality} />
                      <ResultRow label="Date of Birth" value={formatMRZDate(scan.dateOfBirth, false)} />
                      <ResultRow label="Sex" value={scan.sex} />
                      <ResultRow label="Expiry Date" value={formatMRZDate(scan.expiryDate, true)} />
                    </View>

                    {/* Travel Information */}
                    {scan.travelInfo && (
                      <View style={styles.scanSection}>
                        <Text style={styles.scanSectionTitle}>Travel Information</Text>
                        <ResultRow label="Carrier" value={scan.travelInfo.carrier} />
                        <ResultRow label="Routing" value={scan.travelInfo.routing} />
                        <ResultRow label="Flight Number" value={scan.travelInfo.flightNumber} />
                        <ResultRow label="Date of Flight" value={scan.travelInfo.dateOfFlight} />
                        <ResultRow label="Seats" value={scan.travelInfo.seats} />
                        <ResultRow label="Meal" value={scan.travelInfo.meal} />
                      </View>
                    )}

                    {/* Signature */}
                    {scan.signature && (
                      <View style={styles.scanSection}>
                        <Text style={styles.scanSectionTitle}>Signature</Text>
                        <View style={styles.signatureImageContainer}>
                          <Image
                            source={{ uri: scan.signature }}
                            style={styles.savedSignatureImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={[styles.reviewCard, { alignItems: 'center', padding: 32 }]}>
                  <Text style={styles.noScansText}>No saved scans</Text>
                  <Text style={styles.noScansSubtext}>Start by scanning a new document</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : lastScan ? (
        <SafeAreaView style={styles.container}>
          <View style={styles.reviewHeader}>
              <TouchableOpacity
              style={styles.backButton}
              onPress={() => setLastScan(null)}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
              <Text style={styles.backButtonLabel}>Back</Text>
              </TouchableOpacity>
            <Text style={styles.reviewTitle}>Review Scan</Text>
            <View style={styles.headerSpacer} />
            </View>

          <ScrollView style={styles.reviewScrollView}>
            <View style={styles.reviewContent}>
              {/* Label Input Section */}
              <View style={styles.labelSection}>
                <Text style={styles.labelTitle}>Scan Label</Text>
                <TextInput
                  style={styles.labelInput}
                  value={scanLabel}
                  onChangeText={setScanLabel}
                  placeholder="Enter a label for this scan (e.g. Flight AB123 - John Doe)"
                  placeholderTextColor="#8E8E93"
                />
          </View>

              {/* Document Information Section */}
              <View style={styles.reviewSection}>
                <View style={styles.reviewSectionHeader}>
                  <Text style={styles.reviewSectionTitle}>Document Information</Text>
                  <View style={styles.confidenceTag}>
                    <Text style={styles.confidenceText}>
                      Confidence: {Math.round(lastScan.confidence || 0)}%
                  </Text>
                </View>
                </View>
                <View style={scanDetailsStyles.sectionCard}>
                  <View style={scanDetailsStyles.grid}>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="file-text" size={isTablet ? 22 : 18} color="#0A84FF" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Document Type</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.documentType || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="user" size={isTablet ? 22 : 18} color="#FF9500" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Surname</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.surname || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="user" size={isTablet ? 22 : 18} color="#FF9500" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>First Name</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.firstName || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="user" size={isTablet ? 22 : 18} color="#FF9500" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Middle Name</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.middleName || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="hash" size={isTablet ? 22 : 18} color="#34C759" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Passport Number</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.documentNumber || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="flag" size={isTablet ? 22 : 18} color="#FF2D55" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Nationality</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.nationality || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="calendar" size={isTablet ? 22 : 18} color="#5856D6" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Date of Birth</Text>
                        <Text style={scanDetailsStyles.infoValue}>{formatMRZDate(lastScan.dateOfBirth, false)}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="user" size={isTablet ? 22 : 18} color="#FF9500" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Sex</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.sex || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="calendar" size={isTablet ? 22 : 18} color="#5856D6" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Expiry Date</Text>
                        <Text style={scanDetailsStyles.infoValue}>{formatMRZDate(lastScan.expiryDate, true)}</Text>
                      </View>
                    </View>
                    <View style={scanDetailsStyles.gridItem}>
                      <View style={scanDetailsStyles.infoRow}>
                        <Feather name="globe" size={isTablet ? 22 : 18} color="#FF2D55" style={scanDetailsStyles.infoIcon} />
                        <Text style={scanDetailsStyles.infoLabel}>Issuing Country</Text>
                        <Text style={scanDetailsStyles.infoValue}>{lastScan.issuingCountry || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                        </View>
                      </View>

              {/* Travel Information Section */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Travel Information</Text>
                <View style={styles.travelInfoGrid}>
                  {/* Flight Details */}
                  <Text style={styles.subsectionTitle}>Flight Details</Text>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Carrier</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.carrier}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, carrier: text })}
                        placeholder="Enter carrier"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Routing</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.routing}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, routing: text })}
                        placeholder="Enter routing"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Flight Number</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.flightNumber}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, flightNumber: text })}
                        placeholder="Enter flight number"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Date of Flight</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.dateOfFlight}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, dateOfFlight: text })}
                        placeholder="Enter date of flight"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Seats</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.seats}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, seats: text })}
                        placeholder="Enter seats"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Meal</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.meal}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, meal: text })}
                        placeholder="Enter meal preference"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                      </View>

                {/* Personal Information */}
                <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Personal Information</Text>
                <View style={styles.travelInfoGrid}>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Place of Birth (City)</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.birthCity}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, birthCity: text })}
                        placeholder="Enter city of birth"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>State/Province</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.birthState}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, birthState: text })}
                        placeholder="Enter state/province"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Country</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.birthCountry}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, birthCountry: text })}
                        placeholder="Enter country of birth"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>SSN</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.ssn}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, ssn: text })}
                        placeholder="Enter SSN"
                        secureTextEntry
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Current Lodging</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.currentLodging}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, currentLodging: text })}
                        placeholder="Enter current lodging"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Phone Number</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.phoneNumber}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, phoneNumber: text })}
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Email</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.email}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, email: text })}
                        placeholder="Enter email"
                        keyboardType="email-address"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                </View>

                {/* Emergency Contact */}
                <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Emergency Contact</Text>
                <View style={styles.travelInfoGrid}>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Last Name</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyLastName}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyLastName: text })}
                        placeholder="Enter last name"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>First Name</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyFirstName}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyFirstName: text })}
                        placeholder="Enter first name"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Address Line 1</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyAddress1}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyAddress1: text })}
                        placeholder="Enter address line 1"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Address Line 2</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyAddress2}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyAddress2: text })}
                        placeholder="Enter address line 2"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>City</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyCity}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyCity: text })}
                        placeholder="Enter city"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>State/Province</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyState}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyState: text })}
                        placeholder="Enter state/province"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Country</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyCountry}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyCountry: text })}
                        placeholder="Enter country"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Phone</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyPhone}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyPhone: text })}
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Email</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.emergencyEmail}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyEmail: text })}
                        placeholder="Enter email"
                        keyboardType="email-address"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                </View>

                {/* Additional Information */}
                <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Additional Information</Text>
                <View style={styles.travelInfoGrid}>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Medical Condition, current injuries, or limited mobility relevant to evacuation</Text>
                      <TextInput
                        style={[styles.input, { height: 80 }]}
                        value={travelInfo.medicalConditions}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, medicalConditions: text })}
                        placeholder="Enter medical conditions, injuries, or mobility limitations"
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Accompanying Persons (Minor children or incapacitated/incompetent adults traveling with you)</Text>
                      <TextInput
                        style={[styles.input, { height: 80 }]}
                        value={travelInfo.accompanyingPersons}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, accompanyingPersons: text }) }
                        placeholder="List names and relationships"
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#8E8E93"
                        />
                    </View>
                    </View>

                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Billing Address 1</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.billingAddress1}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingAddress1: text })}
                        placeholder="Enter billing address line 1"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Billing Address 2</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.billingAddress2}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingAddress2: text })}
                        placeholder="Enter billing address line 2"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Billing City</Text>
                      <TextInput
                        style={styles.input}
                        value={travelInfo.billingCity}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingCity: text })}
                        placeholder="Enter billing city"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                     <View style={styles.travelInfoField}>
                       <Text style={styles.fieldLabel}>Billing Postal Code</Text>
                       <TextInput
                         style={styles.input}
                         value={travelInfo.billingPostalCode}
                         onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingPostalCode: text })}
                         placeholder="Enter billing postal code"
                         placeholderTextColor="#8E8E93"
                       />
                     </View>
                  </View>
                   <View style={styles.travelInfoRow}>
                     <View style={styles.travelInfoField}>
                       <Text style={styles.fieldLabel}>Billing Country</Text>
                       <TextInput
                         style={styles.input}
                         value={travelInfo.billingCountry}
                         onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingCountry: text })}
                         placeholder="Enter billing country"
                         placeholderTextColor="#8E8E93"
                       />
                     </View>
                  </View>
                   <View style={styles.travelInfoRow}>
                     <View style={styles.travelInfoField}>
                       <Text style={styles.fieldLabel}>Billing Phone</Text>
                       <TextInput
                         style={styles.input}
                         value={travelInfo.billingPhone}
                         onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingPhone: text })}
                         placeholder="Enter billing phone"
                         keyboardType="phone-pad"
                         placeholderTextColor="#8E8E93"
                       />
                     </View>
                     <View style={styles.travelInfoField}>
                       <Text style={styles.fieldLabel}>Billing Email</Text>
                       <TextInput
                         style={styles.input}
                         value={travelInfo.billingEmail}
                         onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingEmail: text })}
                         placeholder="Enter billing email"
                         keyboardType="email-address"
                         placeholderTextColor="#8E8E93"
                       />
                     </View>
                  </View>


                  <View style={styles.travelInfoRow}>
                    <View style={styles.travelInfoField}>
                      <Text style={styles.fieldLabel}>Remarks</Text>
                      <TextInput
                        style={[styles.input, { height: 80 }]}
                        value={travelInfo.remarks}
                        onChangeText={(text) => updateTravelInfo({ ...travelInfo, remarks: text })}
                        placeholder="Enter any additional remarks"
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

                      {/* Action Buttons */}
          <View style={styles.reviewActions}>
                        <TouchableOpacity
                          style={[styles.reviewActionButton, styles.saveButton]}
                          onPress={handleSaveScan}
                        >
                          <Feather name="save" size={18} color="#FFFFFF" style={{marginRight: 8}} />
                          <Text style={styles.reviewActionButtonText}>Save Scan</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.reviewActionButton, styles.eventButton]}
                          onPress={() => setShowEvents(true)}
                        >
                          <Feather name="folder-plus" size={18} color="#FFFFFF" style={{marginRight: 8}} />
                          <Text style={styles.reviewActionButtonText}>Save to Event</Text>
                        </TouchableOpacity>
                      </View>
        </SafeAreaView>
                  ) : (
        <SafeAreaView style={styles.container}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
            <View style={styles.dashboardContainer}>
              <View style={styles.governmentHeader}>
                <View style={styles.headerTitleContainer}>
                  <View style={styles.headerTitleSeal}>
                    <Image 
                      source={require('./assets/us-seal.png')} 
                      style={styles.sealImage} 
                    />
                </View>
                  <Text style={[styles.headerTitle, {color: '#FFFFFF'}]}>Emergency Response</Text>
              </View>
              </View>
              
              {/* Quick Actions Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => setShowScanner(true)}
                  >
                    <View style={[styles.iconContainer, styles.iconContainerBlue]}>
                      <Feather name="maximize" size={isTablet ? 22 : 20} color="#FFFFFF" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>New Scan</Text>
                      <Text style={styles.actionSubtitle}>Scan a new document</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => setShowEvents(true)}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="calendar" size={isTablet ? 22 : 20} color="#1C2833" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Events</Text>
                      <Text style={styles.actionSubtitle}>View and manage events</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => setShowScans(true)}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="list" size={isTablet ? 22 : 20} color="#1C2833" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>All Scans</Text>
                      <Text style={styles.actionSubtitle}>Browse all saved scans</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={handleClearAllData}
                  >
                    <View style={[styles.iconContainer, styles.iconContainerRed]}>
                      <Feather name="trash-2" size={isTablet ? 22 : 20} color="#FFFFFF" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Clear All Data</Text>
                      <Text style={styles.actionSubtitle}>Delete all data</Text>
                    </View>
                  </TouchableOpacity>
                </View>
          </View>

          {/* Quick Stats Section */}
              <View style={[styles.section, { marginBottom: isTablet ? 20 : 16 }]}> 
                <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                    <Feather name="archive" size={isTablet ? 26 : 22} style={styles.statIcon} />
                    <Text style={styles.statNumber}>{dbEvents?.length || 0}</Text>
                    <Text style={styles.statLabel}>Events Created</Text>
              </View>
              
              <View style={styles.statCard}>
                    <Feather name="file-text" size={isTablet ? 26 : 22} style={styles.statIcon} />
                    <Text style={styles.statNumber}>{scans?.length || 0}</Text>
                <Text style={styles.statLabel}>Total Scans</Text>
              </View>
              
              <View style={styles.statCard}>
                    <Feather name="clock" size={isTablet ? 26 : 22} style={styles.statIcon} />
                    <Text style={styles.statNumber}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    <Text style={styles.statLabel}>Today's Date</Text>
                </View>
              </View>
            </View>
              
              {/* Recent Events Section */}
              <View style={[styles.section, { marginTop: 0, marginBottom: isTablet ? 20 : 16 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Events</Text>
                  {dbEvents && dbEvents.length > 5 && (
                    <TouchableOpacity onPress={() => setShowEvents(true)}>
                      <Text style={styles.viewAllButton}>View All</Text>
                    </TouchableOpacity>
                  )}
          </View>
                
                {dbEvents && dbEvents.length > 0 ? (
                  <ScrollView 
                    horizontal={true} 
                    showsHorizontalScrollIndicator={false}
                    style={styles.eventsScrollView}
                    contentContainerStyle={styles.eventsScrollContent}
                  >
                    {dbEvents.slice(0, 5).map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={styles.eventCard}
                        onPress={() => handleEventClick(event)}
                      >
                        <View style={styles.eventCardHeader}>
                          <Feather 
                            name="folder" 
                            size={isTablet ? 18 : 16} 
                            style={styles.eventCardIcon}
                          />
                          <Text style={styles.eventCardTitle} numberOfLines={1}>{event.name}</Text>
        </View>
                        
                        <Text style={styles.eventCardDescription} numberOfLines={2}>
                          {event.description || 'No description provided'}
                        </Text>
                        
                        <View style={styles.eventCardFooter}>
                          <Feather 
                            name="file-text" 
                            size={isTablet ? 14 : 12} 
                            style={styles.eventCardFooterIcon}
                          />
                          <Text style={styles.eventCardScans}>
                            {event.scans?.length || 0} scans
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noEventsCard}>
                    <Feather 
                      name="archive" 
                      size={isTablet ? 40 : 32}
                      style={styles.noEventsIcon}
        />
                    <Text style={styles.noEventsText}>No events created yet</Text>
                    <Text style={styles.noEventsSubtext}>Tap 'Events' in Quick Actions to create one.</Text>
                  </View>
                )}
              </View>

              <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Standard government light background
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: isTablet ? 60 : 40,
  },
  dashboardContainer: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : (isTablet ? 24 : 16),
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 22,
    fontWeight: '600',
    color: '#1C2833', // Dark navy text
    marginBottom: isTablet ? 36 : 28,
    paddingHorizontal: isTablet ? 8 : 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: isTablet ? 24 : 20,
    paddingHorizontal: isTablet ? 0 : 0,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: '600',
    color: '#2C3E50', // Official dark blue
    marginBottom: isTablet ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 14 : 10,
  },
  viewAllButton: {
    fontSize: isTablet ? 15 : 13,
    color: '#1E5D9B', // Official mid-blue
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '48%',
    paddingVertical: isTablet ? 18 : 14,
    paddingHorizontal: isTablet ? 16 : 12,
    borderRadius: 8, // Less rounded, more official
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: isTablet ? 18 : 14,
    minHeight: isTablet ? 100 : 90,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  iconContainer: {
    width: isTablet ? 44 : 38,
    height: isTablet ? 44 : 38,
    borderRadius: 4, // Square-ish for official look
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTablet ? 16 : 12,
    backgroundColor: '#E5E7EB', // Standard light grey
  },
  iconContainerBlue: { 
    backgroundColor: '#103E7E', // Official government blue
  },
  iconContainerPurple: { 
    backgroundColor: '#445069', // Muted official blue-grey 
  },
  iconContainerOrange: { 
    backgroundColor: '#5D5D5D', // Official dark grey
  },
  iconContainerRed: { 
    backgroundColor: '#942926', // Official government red
  },
  actionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: isTablet ? 17 : 15,
    fontWeight: '600',
    color: '#1C2833',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '400',
    color: '#566573',
    lineHeight: isTablet ? 18 : 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: isTablet ? 14 : 10,
    marginBottom: isTablet ? 24 : 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Less rounded, more official
    paddingVertical: isTablet ? 20 : 16,
    paddingHorizontal: isTablet ? 12 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 120 : 100,
    gap: isTablet ? 10 : 8,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  // Remove statCardEvents, statCardScans, statCardDate - no colorful tints
  statIcon: { 
    marginBottom: isTablet ? 8 : 6,
    color: '#103E7E', // Official government blue
  },
  statNumber: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '600',
    color: '#1C2833',
  },
  statLabel: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '500',
    color: '#566573',
    textAlign: 'center',
  },
  eventsScrollView: {
    // No style needed here usually
  },
  eventsScrollContent: {
    paddingVertical: 6,
    paddingHorizontal: isTablet ? 2 : 1,
    gap: isTablet ? 14 : 10,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Less rounded, more official
    padding: isTablet ? 18 : 14,
    width: isTablet ? 280 : 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 120 : 100,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1, // Add a separator line
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  eventCardIcon: {
    marginRight: 8,
    color: '#103E7E', // Official government blue
  },
  eventCardTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1C2833',
    flex: 1,
  },
  eventCardDescription: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '400',
    color: '#566573',
    lineHeight: isTablet ? 18 : 16,
    marginBottom: 10,
    flexGrow: 1,
  },
  eventCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    borderTopWidth: 1, // Add a separator line
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  eventCardFooterIcon: {
    marginRight: 4,
    color: '#103E7E', // Official government blue
  },
  eventCardScans: {
    fontSize: isTablet ? 13 : 11,
    color: '#103E7E', // Official government blue
    fontWeight: '500',
  },
  noEventsCard: {
    backgroundColor: '#F7F9FA', // Very light grey
    borderRadius: 8, // Less rounded, more official
    paddingVertical: isTablet ? 28 : 22,
    paddingHorizontal: isTablet ? 24 : 18,
    width: isTablet ? 280 : 240,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    minHeight: isTablet ? 140 : 120,
    gap: 12,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    marginHorizontal: isTablet ? 2 : 1,
  },
  noEventsIcon: {
    color: '#A9B2BC', // Grey blue
  },
  noEventsText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  noEventsSubtext: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '400',
    color: '#566573',
    textAlign: 'center',
    lineHeight: isTablet ? 18 : 16,
  },
  versionText: {
    fontSize: isTablet ? 12 : 10,
    color: '#808B96',
    textAlign: 'center',
    marginTop: isTablet ? 16 : 12,
    paddingBottom: isTablet ? 16 : 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
    backgroundColor: '#103E7E',
    borderBottomWidth: 1,
    borderBottomColor: '#0C3263',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backButtonText: {
    fontSize: isTablet ? 28 : 24,
    color: '#FFFFFF',
    marginRight: 4,
  },
  backButtonLabel: {
    fontSize: isTablet ? 17 : 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  headerSpacer: {
    minWidth: 80,
  },
  reviewTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  reviewScrollView: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  reviewContent: {
    padding: 20,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1C2833',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
    paddingBottom: 6,
  },
  confidenceTag: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  confidenceText: {
    color: '#fff',
    fontSize: isTablet ? 14 : 13,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: isTablet ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  reviewActionButton: {
    flex: 1,
    paddingVertical: isTablet ? 14 : 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#103E7E',
  },
  eventButton: {
    backgroundColor: '#2C3E50',
  },
  reviewActionButtonText: {
    color: '#fff',
    fontSize: isTablet ? 16 : 15,
    fontWeight: '600',
  },
  
  // Update styles for the Label section
  labelSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: isTablet ? 20 : 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  labelTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1C2833',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  labelInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: isTablet ? 16 : 14,
    backgroundColor: '#F9F9FB',
  },
  
  // Update styles for subsections in Travel Information
  subsectionTitle: {
    fontSize: isTablet ? 17 : 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  // Update input styles
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: isTablet ? 15 : 14,
    backgroundColor: '#F9F9FB',
  },
  
  // Update field label styles
  fieldLabel: {
    fontSize: isTablet ? 15 : 13,
    fontWeight: '500',
    color: '#566573',
    marginBottom: 8,
  },
  eventDetailsContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Match app background
    padding: 20,
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#103E7E', // Government blue
    marginHorizontal: -20, // Compensate for padding
    marginTop: -20, // Compensate for padding
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#8F9CB3', // Lighter blue-grey border
  },
  eventDetailsTitle: {
    fontSize: isTablet ? 22 : 20,
    fontWeight: '600',
    color: '#FFFFFF', // White text on blue background
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#103E7E', // Government blue
    borderRadius: 4, // Square-ish
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: '#103E7E', // Government blue
  },
  checkboxText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1C2833',
  },
  scanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scanCardContent: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  scanCardHeader: {
    backgroundColor: '#F0F2F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanCardTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1C2833',
    flex: 1,
  },
  scanCardDate: {
    fontSize: isTablet ? 13 : 11,
    color: '#566573',
  },
  scanCardBody: {
    padding: 12,
  },
  scanDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  scanDetailLabel: {
    fontSize: isTablet ? 14 : 12,
    color: '#566573',
    width: 100,
    fontWeight: '500',
  },
  scanDetailValue: {
    fontSize: isTablet ? 14 : 12,
    color: '#1C2833',
    flex: 1,
    fontWeight: '400',
  },
  scanCardSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  scanCardSectionTitle: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    color: '#103E7E',
    marginBottom: 6,
  },
  eventInfoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  eventDetailsDescription: {
    fontSize: isTablet ? 15 : 13,
    color: '#566573',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    padding: 0,
    width: '100%',
    maxWidth: isTablet ? 650 : 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  modalTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1C2833',
  },
  modalCloseButton: {
    padding: 8,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8, 
    padding: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    overflow: 'hidden',
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  eventItemBody: {
    padding: 12,
  },
  eventItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventName: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1C2833',
    flex: 1,
  },
  eventList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // EventDetails styles (add to StyleSheet)
  eventDetailHeader: {
    backgroundColor: '#103E7E',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0C3263',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventDetailTitle: {
    color: '#FFFFFF',
    fontSize: isTablet ? 22 : 18,
    fontWeight: '600',
    flex: 1,
  },
  eventDetailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    overflow: 'hidden',
  },
  eventDetailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F2F5',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  eventDetailSectionTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1C2833',
  },
  scanCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 12,
  },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scanCardTitle: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    color: '#103E7E',
    flex: 1,
    marginLeft: 8,
  },
  scanCardDate: {
    fontSize: 12,
    color: '#64748B',
  },
  scanDetailRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingLeft: 30,
  },
  scanDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    width: 90,
    fontWeight: '500',
  },
  scanDetailValue: {
    fontSize: 13,
    color: '#1C2833',
    flex: 1,
  },
  exportButton: {
    backgroundColor: '#103E7E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: isTablet ? 20 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: isTablet ? 16 : 14,
    marginLeft: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  governmentHeader: {
    backgroundColor: '#103E7E', // Official government blue
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally
    borderBottomWidth: 1,
    borderBottomColor: '#0C3263',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 24,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content
  },
  headerTitleSeal: {
    width: isTablet ? 56 : 40, // Larger seal
    height: isTablet ? 56 : 40, // Larger seal
    marginRight: 14,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: isTablet ? 30 : 22,
    fontWeight: '700',
    color: '#1C2833', // Update color to white in the JSX
    marginBottom: 0, // Remove bottom margin
    paddingHorizontal: isTablet ? 8 : 4,
    textAlign: 'center',
  },
  sealImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
  travelInfoGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: isTablet ? 20 : 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  travelInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  travelInfoField: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: isTablet ? 15 : 14,
    color: '#1C2833',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#566573',
    marginTop: 12,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: isTablet ? 14 : 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
