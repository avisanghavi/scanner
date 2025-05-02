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
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import MRZScanner from './MRZScanner';
import { useDatabase } from './src/hooks/useDatabase';
import { testSQLite } from './src/utils/dbTest';
import { getEventWithScans, updateEvent, deleteAllData, insertScan, migrateDatabase } from './src/utils/db';
import generateFormPDF from './src/utils/pdfGenerator';
import MRZRecognizer from './MRZRecognizer.js';

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

const EventSelector = ({ visible, onClose, onSelect, onCreateNew, events }) => {
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }

    try {
      const eventData = {
        name: newEventName.trim(),
        description: newEventDescription.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const savedEvent = await onCreateNew(eventData);
      setNewEventName('');
      setNewEventDescription('');
      setShowCreateNew(false);
      onSelect(savedEvent);
    } catch (e) {
      Alert.alert('Error', 'Failed to create event: ' + e.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Event</Text>
          
          {!showCreateNew ? (
            <>
              <ScrollView style={styles.eventList}>
                {events.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => onSelect(event)}
                  >
                    <Text style={styles.eventName}>{event.name}</Text>
                    <Text style={styles.eventDescription} numberOfLines={2}>
                      {event.description}
                    </Text>
                    <Text style={styles.eventDate}>
                      Created: {new Date(event.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.scanCount}>
                      Scans: {event.scans?.length || 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                onPress={() => setShowCreateNew(true)}
              >
                  <Text style={styles.modalButtonText}>Create New Event</Text>
              </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#8E8E93', marginTop: 8 }]}
                  onPress={onClose}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.createEventForm}>
              <TextInput
                style={styles.modalInput}
                placeholder="Event Name"
                value={newEventName}
                onChangeText={setNewEventName}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.modalInput, { height: 100 }]}
                placeholder="Event Description"
                value={newEventDescription}
                onChangeText={setNewEventDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#34C759' }]}
                  onPress={handleCreateEvent}
                >
                  <Text style={styles.modalButtonText}>Create Event</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#FF3B30', marginTop: 8 }]}
                  onPress={() => setShowCreateNew(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const ScanDetails = ({ scan, onBack }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await generateFormPDF(scan);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF: ' + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.reviewHeader}>
                <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>←</Text>
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.reviewTitle}>{scan.label || 'Scan Details'}</Text>
        <TouchableOpacity
          style={[styles.pdfButton, isGeneratingPDF && styles.pdfButtonDisabled]}
          onPress={handleGeneratePDF}
          disabled={isGeneratingPDF}
                >
          {isGeneratingPDF ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.pdfButtonText}>Generate PDF</Text>
          )}
                </TouchableOpacity>
              </View>

      <ScrollView style={styles.reviewScrollView}>
        <View style={styles.reviewContent}>
          {/* Document Information Section */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <Text style={styles.reviewSectionTitle}>Document Information</Text>
              {scan.confidence && (
                <View style={styles.confidenceTag}>
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(scan.confidence)}%
                  </Text>
            </View>
          )}
            </View>

            <View style={styles.reviewCard}>
              <ResultRow label="Document Type" value={scan.documentType} />
              <ResultRow label="Surname" value={scan.surname} />
              <ResultRow label="First Name" value={scan.firstName} />
              <ResultRow label="Middle Name" value={scan.middleName} />
              <ResultRow label="Passport Number" value={scan.documentNumber} />
              <ResultRow label="Nationality" value={scan.nationality} />
              <ResultRow label="Date of Birth" value={formatMRZDate(scan.dateOfBirth, false)} />
              <ResultRow label="Sex" value={scan.sex} />
              <ResultRow label="Expiry Date" value={formatMRZDate(scan.expiryDate, true)} />
              <ResultRow label="Issuing Country" value={scan.issuingCountry} />
            </View>
          </View>

          {/* Travel Information Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Travel Information</Text>
            <View style={styles.reviewCard}>
              <ResultRow label="Carrier" value={scan.carrier} />
              <ResultRow label="Routing" value={scan.routing} />
              <ResultRow label="Flight Number" value={scan.flightNumber} />
              <ResultRow label="Date of Flight" value={scan.dateOfFlight} />
              <ResultRow label="Seats" value={scan.seats} />
              <ResultRow label="Meal" value={scan.meal} />
            </View>
          </View>

          {/* Personal Information Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Personal Information</Text>
            <View style={styles.reviewCard}>
              <ResultRow label="Place of Birth (City)" value={scan.birthCity} />
              <ResultRow label="State/Province" value={scan.birthState} />
              <ResultRow label="Country" value={scan.birthCountry} />
              <ResultRow label="Social Security Number" value={scan.ssn} />
            </View>
          </View>

          {/* Current Lodging Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Current Lodging</Text>
            <View style={styles.reviewCard}>
              <ResultRow label="Current Lodging (where you may be contacted now)" value={scan.currentLodging} />
              <ResultRow label="Phone Number (where you may be contacted now)" value={scan.phoneNumber} />
              <ResultRow label="Email Address (where you may be contacted now)" value={scan.email} />
            </View>
          </View>

          {/* Medical Condition Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Medical Condition</Text>
            <View style={styles.reviewCard}>
              <ResultRow 
                label="Medical Condition, current injuries, or limited mobility relevant to evacuation" 
                value={scan.medicalConditions} 
              />
            </View>
          </View>

          {/* Billing Address Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Billing Address</Text>
            <View style={styles.reviewCard}>
              <ResultRow label="Address Line 1" value={scan.billingAddress1} />
              <ResultRow label="Address Line 2" value={scan.billingAddress2} />
              <ResultRow label="City" value={scan.billingCity} />
              <ResultRow label="Country" value={scan.billingCountry} />
              <ResultRow label="Postal Code" value={scan.billingPostalCode} />
              <ResultRow label="Phone" value={scan.billingPhone} />
              <ResultRow label="Email" value={scan.billingEmail} />
            </View>
          </View>

          {/* Emergency Contact Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Emergency Contact</Text>
            <Text style={styles.sectionNote}>Do not put someone traveling with you</Text>
            <View style={styles.reviewCard}>
              <ResultRow label="Last Name" value={scan.emergencyLastName} />
              <ResultRow label="First Name" value={scan.emergencyFirstName} />
              <ResultRow label="Address Line 1" value={scan.emergencyAddress1} />
              <ResultRow label="Address Line 2" value={scan.emergencyAddress2} />
              <ResultRow label="City" value={scan.emergencyCity} />
              <ResultRow label="State/Province" value={scan.emergencyState} />
              <ResultRow label="Country" value={scan.emergencyCountry} />
              <ResultRow label="Phone" value={scan.emergencyPhone} />
              <ResultRow label="Email" value={scan.emergencyEmail} />
            </View>
          </View>

          {/* Accompanying Persons Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Accompanying Persons</Text>
            <Text style={styles.sectionNote}>Minor children or incapacitated/incompetent adults traveling with you</Text>
            <View style={styles.reviewCard}>
              <ResultRow label="Accompanying Persons" value={scan.accompanyingPersons} />
            </View>
          </View>

          {/* Signature Section */}
          {scan.signature && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Signature</Text>
              <View style={styles.reviewCard}>
                <View style={styles.signatureImageContainer}>
                  <Image
                    source={{ uri: scan.signature }}
                    style={styles.savedSignatureImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Scan Metadata */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Scan Information</Text>
            <View style={styles.reviewCard}>
              <ResultRow 
                label="Scan Date" 
                value={new Date(scan.savedAt).toLocaleString()} 
              />
              <ResultRow 
                label="Label" 
                value={scan.label || 'No Label'} 
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const EventDetails = ({ event, onClose, onNewScan }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadScans = async () => {
      try {
        if (!event || !event.id) {
          console.error('Invalid event data:', event);
          setError('Invalid event data');
          setScans([]);
          return;
        }

        const eventWithScans = await getEventWithScans(event.id);
        if (!eventWithScans) {
          console.error('Event not found:', event.id);
          setError('Event not found');
          setScans([]);
          return;
        }

        setScans(eventWithScans.scans || []);
        setError(null);
      } catch (error) {
        console.error('Error loading scans:', error);
        setError('Failed to load scans');
        setScans([]);
      } finally {
        setLoading(false);
      }
    };

    loadScans();
  }, [event?.id]);

  if (selectedScan) {
    return <ScanDetails scan={selectedScan} onBack={() => setSelectedScan(null)} />;
  }

  return (
    <View style={styles.eventDetailsContainer}>
      <View style={styles.eventDetailsHeader}>
        <Text style={styles.eventDetailsTitle}>{event?.name || 'Event Details'}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.eventDescription}>{event?.description || ''}</Text>
      
      <View style={styles.eventActionsContainer}>
          <TouchableOpacity
          style={styles.newScanButton}
          onPress={() => {
            onClose();
            onNewScan(event);
          }}
          >
          <Text style={styles.newScanButtonText}>New Scan</Text>
          </TouchableOpacity>
        </View>

      <ScrollView style={styles.eventDetailsScroll}>
        <View style={styles.scansSection}>
          <Text style={styles.sectionTitle}>Scans ({scans.length})</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
      </View>
          ) : scans.length === 0 ? (
            <Text style={styles.noScansText}>No scans saved to this event yet</Text>
          ) : (
            <View style={styles.scansList}>
              {scans.map((scan) => (
                <TouchableOpacity
                  key={scan.id}
                  style={styles.scanCard}
                  onPress={() => setSelectedScan(scan)}
                >
                  <View style={styles.scanHeader}>
                    <Text style={styles.scanTitle}>
                      {scan.label || `${scan.documentType || 'Document'} - ${scan.surname || ''} ${scan.firstName || ''}`}
                    </Text>
                    <Text style={styles.scanDate}>
                      {new Date(scan.savedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={styles.scanDetails}>
                    <Text>Document: {scan.documentNumber || 'N/A'}</Text>
                    <Text>Name: {scan.firstName} {scan.surname}</Text>
                  </View>
                  
                  <View style={styles.travelInfo}>
                    <Text style={styles.travelInfoTitle}>Travel Information</Text>
                    <Text>Carrier: {scan.carrier || 'N/A'}</Text>
                    <Text>Flight: {scan.flightNumber || 'N/A'}</Text>
                    <Text>Date: {scan.dateOfFlight || 'N/A'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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

  useEffect(() => {
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
  }, []);

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

  const handleCreateEvent = async (eventData) => {
    try {
      // Create a new event with proper fields
      const newEvent = {
        name: eventData.name,
        description: eventData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scans: [] // Start with empty scans array
      };

      // Save the event to the database using addEvent from useDatabase hook
      const savedEvent = await addEvent(newEvent);
      
      // If we have a scan, add it to the event
      if (lastScan) {
        // Fix to properly handle scan data without nesting travelInfo
        const { travelInfo: _, ...mrzData } = lastScan; // Destructure lastScan, excluding its travelInfo
        const scanToSave = {
          ...mrzData, // Use only the MRZ-related data from lastScan
          label: scanLabel.trim() || `${mrzData.firstName || ''} ${mrzData.surname || ''} - ${mrzData.documentNumber || 'No ID'}`,
          savedAt: new Date().toISOString(),
          eventId: savedEvent.id, // Set the eventId directly
          
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
          
          // Travel Information - directly from travelInfo state
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
        
        // Save the scan directly with the event ID
        await insertScan(scanToSave);

        // Reset scan states
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
      }
      
      setShowEvents(false);
      await loadEvents(); // Reload events list
      return savedEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event: ' + error.message);
      throw error;
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
    setShowEvents(false);
      
      Alert.alert('Success', 'Scan saved to event successfully');
      await loadEvents();
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
          onSelect={lastScan ? handleSaveToEvent : handleEventClick}
          onCreateNew={handleCreateEvent}
          events={dbEvents}
        />
      ) : showEventDetails && selectedEvent ? (
        <EventDetails
          event={selectedEvent}
          onClose={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
          onNewScan={(event) => {
            setShowEventDetails(false);
            setShowScanner(true);
            setSelectedEvent(event);
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
              <Text style={styles.backButtonText}>←</Text>
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
                  placeholderTextColor="#999"
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

                <View style={styles.reviewCard}>
                  <ResultRow label="Document Type" value={lastScan.documentType} />
                  <ResultRow label="Surname" value={lastScan.surname} />
                  <ResultRow label="First Name" value={lastScan.firstName} />
                  <ResultRow label="Middle Name" value={lastScan.middleName} />
                  <ResultRow label="Passport Number" value={lastScan.documentNumber} />
                  <ResultRow label="Nationality" value={lastScan.nationality} />
                  <ResultRow label="Date of Birth" value={formatMRZDate(lastScan.dateOfBirth, false)} />
                  <ResultRow label="Sex" value={lastScan.sex} />
                  <ResultRow label="Expiry Date" value={formatMRZDate(lastScan.expiryDate, true)} />
                  <ResultRow label="Issuing Country" value={lastScan.issuingCountry} />
                        </View>
                      </View>

              {/* Travel Information Section */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Travel Information</Text>
                <View style={styles.reviewCard}>
                  {/* Flight Details */}
                  <Text style={styles.subsectionTitle}>Flight Details</Text>
                  <View style={styles.travelInfoGrid}>
                    <View style={styles.travelInfoRow}>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>Carrier</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.carrier}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, carrier: text })}
                          placeholder="Enter carrier"
                        />
                      </View>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>Routing</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.routing}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, routing: text })}
                          placeholder="Enter routing"
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
                        />
                      </View>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>Date of Flight</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.dateOfFlight}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, dateOfFlight: text })}
                          placeholder="Enter date of flight"
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
                        />
                      </View>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>Meal</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.meal}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, meal: text })}
                          placeholder="Enter meal preference"
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
                        />
                      </View>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>State/Province</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.birthState}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, birthState: text })}
                          placeholder="Enter state/province"
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
                        />
                      </View>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>First Name</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.emergencyFirstName}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyFirstName: text })}
                          placeholder="Enter first name"
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
                        />
                      </View>
                      <View style={styles.travelInfoField}>
                        <Text style={styles.fieldLabel}>State/Province</Text>
                        <TextInput
                          style={styles.input}
                          value={travelInfo.emergencyState}
                          onChangeText={(text) => updateTravelInfo({ ...travelInfo, emergencyState: text })}
                          placeholder="Enter state/province"
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
                        />
                      </View>
                       <View style={styles.travelInfoField}>
                         <Text style={styles.fieldLabel}>Billing Postal Code</Text>
                         <TextInput
                           style={styles.input}
                           value={travelInfo.billingPostalCode}
                           onChangeText={(text) => updateTravelInfo({ ...travelInfo, billingPostalCode: text })}
                           placeholder="Enter billing postal code"
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
                        />
                      </View>
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
              <Text style={styles.reviewActionButtonText}>Save Scan</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
              style={[styles.reviewActionButton, styles.eventButton]}
              onPress={() => setShowEvents(true)}
                        >
              <Text style={styles.reviewActionButtonText}>Save to Event</Text>
                        </TouchableOpacity>
                      </View>
        </SafeAreaView>
                  ) : (
        <SafeAreaView style={styles.container}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.dashboardContainer}>
              <View style={styles.contentWrapper}>
                <Text style={styles.headerTitle}>MRZ Scanner</Text>
                
                {/* Quick Actions Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  <View style={styles.quickActionsGrid}>
                    <TouchableOpacity 
                      style={[styles.actionCard, { backgroundColor: '#007AFF' }]} 
                      onPress={() => setShowScanner(true)}
                    >
                      <Text style={styles.actionTitle}>New Scan</Text>
                      <Text style={styles.actionSubtitle}>Scan a new document</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionCard, { backgroundColor: '#5856D6' }]} 
                      onPress={() => setShowEvents(true)}
                    >
                      <Text style={styles.actionTitle}>Events</Text>
                      <Text style={styles.actionSubtitle}>View all events</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionCard, { backgroundColor: '#FF9500' }]} 
                      onPress={() => setShowScans(true)}
                    >
                      <Text style={styles.actionTitle}>All Scans</Text>
                      <Text style={styles.actionSubtitle}>View all scans</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionCard, { backgroundColor: '#FF3B30' }]} 
                      onPress={handleClearAllData}
                    >
                      <Text style={styles.actionTitle}>Clear All Data</Text>
                      <Text style={styles.actionSubtitle}>Delete all events and scans</Text>
                    </TouchableOpacity>
                </View>
              </View>

                <View style={styles.twoColumnLayout}>
                  {/* Recent Activity Section */}
                  <View style={[styles.section, styles.columnSection]}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.recentActivityCard}>
                      <Text style={styles.noActivityText}>No recent scans</Text>
                      <Text style={styles.noActivitySubtext}>Start by scanning a new document</Text>
              </View>
          </View>

          {/* Quick Stats Section */}
                  <View style={[styles.section, styles.columnSection]}>
                    <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{dbEvents?.length || 0}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
              
              <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{scans?.length || 0}</Text>
                <Text style={styles.statLabel}>Total Scans</Text>
              </View>
              
              <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
            </View>
          </View>
        </View>

                {/* Recent Events Section */}
                <View style={[styles.section, { marginTop: isTablet ? 32 : 24 }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Events</Text>
                    <TouchableOpacity onPress={() => setShowEvents(true)}>
                      <Text style={styles.viewAllButton}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView 
                    horizontal={true} 
                    showsHorizontalScrollIndicator={false}
                    style={styles.eventsScrollView}
                    contentContainerStyle={styles.eventsScrollContent}
                  >
                    {dbEvents && dbEvents.length > 0 ? (
                      dbEvents.slice(0, 5).map((event) => (
                        <TouchableOpacity
                          key={event.id}
                          style={styles.eventCard}
                          onPress={() => handleEventClick(event)}
                        >
                          <View style={styles.eventCardHeader}>
                            <Text style={styles.eventCardTitle}>{event.name}</Text>
                            <Text style={styles.eventCardDate}>
                              {new Date(event.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                          
                          <Text style={styles.eventCardDescription} numberOfLines={2}>
                            {event.description || 'No description'}
                          </Text>
                          
                          <View style={styles.eventCardFooter}>
                            <Text style={styles.eventCardScans}>
                              {event.scans?.length || 0} scans
                            </Text>
        </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noEventsCard}>
                        <Text style={styles.noEventsText}>No events created</Text>
                        <Text style={styles.noEventsSubtext}>Create your first event to get started</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

                <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
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
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    padding: isTablet ? 40 : 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + (isTablet ? 40 : 20) : (isTablet ? 40 : 20),
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: isTablet ? 1024 : '100%',
  },
  headerTitle: {
    fontSize: isTablet ? 34 : 28,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: isTablet ? 32 : 24,
  },
  section: {
    marginBottom: isTablet ? 32 : 24,
    width: '100%',
  },
  columnSection: {
    flex: 1,
    marginHorizontal: isTablet ? 12 : 0,
  },
  sectionTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: isTablet ? 20 : 16,
  },
  twoColumnLayout: {
    flexDirection: isTablet ? 'row' : 'column',
    marginHorizontal: isTablet ? -12 : 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 16 : 12,
  },
  actionCard: {
    flex: 1,
    minWidth: isTablet ? 200 : '30%',
    padding: isTablet ? 24 : 16,
    borderRadius: isTablet ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionTitle: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: isTablet ? 15 : 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  recentActivityCard: {
    backgroundColor: '#fff',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 32 : 24,
    alignItems: 'center',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noActivityText: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  noActivitySubtext: {
    fontSize: isTablet ? 17 : 15,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: isTablet ? 16 : 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 24 : 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isTablet ? 15 : 13,
    color: '#666',
  },
  versionText: {
    fontSize: isTablet ? 15 : 13,
    color: '#666',
    textAlign: 'center',
    marginTop: isTablet ? 32 : 24,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewEventsButton: {
    backgroundColor: '#5856D6',
    shadowColor: '#5856D6',
  },
  viewScansButton: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
  },
  resultContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  resultLabel: {
    flex: 1,
    fontSize: isTablet ? 16 : 15,
    fontWeight: '500',
    color: '#666',
    marginRight: 12,
  },
  resultValue: {
    flex: 2,
    fontSize: isTablet ? 16 : 15,
    color: '#1c1c1e',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  eventButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    position: 'absolute',
    left: 20,
    top: 20,
  },
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  scanDate: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  scanConfidence: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  scanContent: {
    marginBottom: 20,
  },
  travelInfoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet ? 40 : 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 32 : 24,
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: isTablet ? 24 : 20,
    textAlign: 'center',
  },
  eventList: {
    marginBottom: 16,
  },
  eventItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 20 : 16,
    marginBottom: 12,
  },
  eventName: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: isTablet ? 16 : 15,
    color: '#666',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: isTablet ? 14 : 13,
    color: '#999',
  },
  scanCount: {
    fontSize: isTablet ? 14 : 13,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  createEventForm: {
    width: '100%',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 16 : 12,
    fontSize: isTablet ? 17 : 16,
    backgroundColor: '#fff',
    color: '#1c1c1e',
    marginBottom: 16,
  },
  modalButtonContainer: {
    marginTop: 8,
    gap: 8,
  },
  modalButton: {
    width: '100%',
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: isTablet ? 16 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 20 : 16,
  },
  viewAllButton: {
    fontSize: isTablet ? 16 : 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  eventsScrollView: {
    marginLeft: -20,
    paddingLeft: 20,
    marginRight: -20,
    paddingRight: 20,
  },
  eventsScrollContent: {
    paddingVertical: 8,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 24 : 20,
    marginRight: 16,
    width: isTablet ? 320 : 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventCardTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1c1c1e',
    flex: 1,
    marginRight: 8,
  },
  eventCardDate: {
    fontSize: isTablet ? 14 : 12,
    color: '#666',
  },
  eventCardDescription: {
    fontSize: isTablet ? 15 : 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: isTablet ? 22 : 20,
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardScans: {
    fontSize: isTablet ? 14 : 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  noEventsCard: {
    backgroundColor: '#fff',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 24 : 20,
    width: isTablet ? 320 : 280,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noEventsText: {
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  noEventsSubtext: {
    fontSize: isTablet ? 15 : 14,
    color: '#666',
    textAlign: 'center',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backButtonText: {
    fontSize: isTablet ? 28 : 24,
    color: '#007AFF',
    marginRight: 4,
  },
  backButtonLabel: {
    fontSize: isTablet ? 17 : 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerSpacer: {
    minWidth: 80,
  },
  reviewTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center',
  },
  reviewScrollView: {
    flex: 1,
    backgroundColor: '#f5f5f7',
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
    fontSize: isTablet ? 22 : 20,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  confidenceTag: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: isTablet ? 14 : 13,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 24 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  reviewActionButton: {
    flex: 1,
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: isTablet ? 16 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  eventButton: {
    backgroundColor: '#007AFF',
  },
  reviewActionButtonText: {
    color: '#fff',
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
  },
  scanSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  scanSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 12,
  },
  noScansText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  noScansSubtext: {
    fontSize: isTablet ? 15 : 14,
    color: '#666',
  },
  eventDetailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  eventDetailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scansSection: {
    flex: 1,
  },
  scansList: {
    flex: 1,
  },
  scanCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scanDetails: {
    marginBottom: 15,
  },
  travelInfo: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  travelInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  eventDetailsScroll: {
    flex: 1,
  },
  travelInfoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  travelInfoForm: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  travelInfoGrid: {
    gap: 15,
  },
  travelInfoRow: {
    flexDirection: 'row',
    gap: 15,
  },
  travelInfoField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  formSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  signatureSection: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  signatureWrapper: {
    flex: 1,
    height: 400,
    marginVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signaturePageContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  signaturePageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  signaturePageContent: {
    flex: 1,
    padding: 20,
  },
  signaturePageSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  signatureImageContainer: {
    height: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  savedSignatureImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  labelSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  labelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  labelInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  scanListItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  scanListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  scanLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  scanDate: {
    fontSize: 14,
    color: '#666',
  },
  scanListPreview: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  previewText: {
    fontSize: 14,
    color: '#666',
  },
  expandedContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  scanPreview: {
    marginTop: 8,
    marginBottom: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'right',
    fontWeight: '500',
  },
  signatureImageContainer: {
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  savedSignatureImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  subsectionTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1c1c1e',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 12
  },
  pdfButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  pdfButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  eventActionsContainer: {
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  newScanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newScanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});