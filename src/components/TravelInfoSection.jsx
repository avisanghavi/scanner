import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SignaturePage from './SignaturePage'; // Import SignaturePage

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const TravelInfoSection = ({ data, onUpdate }) => {
  const [currentSection, setCurrentSection] = useState('flightDetails');
  const [showSignature, setShowSignature] = useState(false);
  const [progress, setProgress] = useState(16.6);
  
  const sectionProgress = {
    'flightDetails': 16.6,
    'personalInfo': 33.2,
    'contactInfo': 49.8,
    'additionalInfo': 66.4,
    'billingAddress': 83.0,
    'emergencyContact': 100,
  };

  useEffect(() => {
    setProgress(sectionProgress[currentSection] || 0);
  }, [currentSection]);

  const handleFieldUpdate = (fieldName, value) => {
    const updatedData = {
      ...data,
      [fieldName]: value
    };
    onUpdate(updatedData);
  };

  const handleSignatureSave = (signatureData) => {
    const updatedData = {
      ...data,
      signature: signatureData
    };
    onUpdate(updatedData);
    setShowSignature(false);
  };

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarTrack}>
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { width: `${progress}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
    </View>
  );

  const renderNextButton = (nextSection) => (
    <TouchableOpacity
      style={styles.continueButton}
      onPress={() => {
        setCurrentSection(nextSection);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <Text style={styles.continueButtonText}>Next</Text>
      <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'flightDetails':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Flight Details</Text>
            <View style={styles.travelInfoGrid}>
              {/* Flight Details Inputs */}
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Carrier</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="plane" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.carrier}
                      onChangeText={(text) => handleFieldUpdate('carrier', text)}
                      placeholder="Enter carrier"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Routing</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="map" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.routing}
                      onChangeText={(text) => handleFieldUpdate('routing', text)}
                      placeholder="Enter routing"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                 <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Flight Number</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="hash" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.flightNumber}
                      onChangeText={(text) => handleFieldUpdate('flightNumber', text)}
                      placeholder="Enter flight number"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                 <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Date of Flight</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="calendar" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.dateOfFlight}
                      onChangeText={(text) => handleFieldUpdate('dateOfFlight', text)}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
               <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Seats</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="pocket" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.seats}
                      onChangeText={(text) => handleFieldUpdate('seats', text)}
                      placeholder="Enter seat numbers"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Meal Preference</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="coffee" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.meal}
                      onChangeText={(text) => handleFieldUpdate('meal', text)}
                      placeholder="Enter meal preference"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
            </View>
            {renderNextButton('personalInfo')}
          </View>
        );
      case 'personalInfo':
         return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Personal Information</Text>
            <View style={styles.travelInfoGrid}>
              {/* Personal Info Inputs */}
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Birth City</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="map-pin" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.birthCity}
                      onChangeText={(text) => handleFieldUpdate('birthCity', text)}
                      placeholder="Enter birth city"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Birth State</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="flag" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.birthState}
                      onChangeText={(text) => handleFieldUpdate('birthState', text)}
                      placeholder="Enter birth state"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Birth Country</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="globe" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.birthCountry}
                      onChangeText={(text) => handleFieldUpdate('birthCountry', text)}
                      placeholder="Enter birth country"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>SSN</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="lock" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.ssn}
                      onChangeText={(text) => handleFieldUpdate('ssn', text)}
                      placeholder="Enter SSN"
                      secureTextEntry
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
            </View>
            {renderNextButton('contactInfo')}
          </View>
        );
      case 'contactInfo':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Current Lodging</Text>
            <View style={styles.travelInfoGrid}>
              {/* Contact Info Inputs */}
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Current Lodging</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="home" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.currentLodging}
                      onChangeText={(text) => handleFieldUpdate('currentLodging', text)}
                      placeholder="Enter current lodging"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="phone" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.phoneNumber}
                      onChangeText={(text) => handleFieldUpdate('phoneNumber', text)}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="mail" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.email}
                      onChangeText={(text) => handleFieldUpdate('email', text)}
                      placeholder="Enter email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
            </View>
            {renderNextButton('additionalInfo')}
          </View>
        );
      case 'additionalInfo':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Medical Condition</Text>
            <View style={styles.travelInfoGrid}>
              {/* Additional Info Inputs */}
              <View style={styles.travelInfoRow}>
                <View style={[styles.travelInfoField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>
                    Medical Condition, current injuries, or limited mobility relevant to evacuation
                  </Text>
                  <View style={[styles.inputContainer, { height: 120 }]}>
                    <Feather name="activity" size={isTablet ? 18 : 16} color="#8E8E93" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 12 }]} />
                    <TextInput
                      style={[styles.input, { height: '100%', textAlignVertical: 'top', paddingTop: 12 }]}
                      value={data.medicalConditions}
                      onChangeText={(text) => handleFieldUpdate('medicalConditions', text)}
                      placeholder="Enter medical conditions, injuries, or mobility limitations"
                      multiline
                      numberOfLines={5}
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
            </View>
            {renderNextButton('billingAddress')}
          </View>
        );
      case 'billingAddress':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Billing Address</Text>
            <View style={styles.travelInfoGrid}>
              {/* Billing Address Inputs */}
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Street Address</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="map-pin" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.billingAddress1}
                      onChangeText={(text) => handleFieldUpdate('billingAddress1', text)}
                      placeholder="Enter street address"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="navigation" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.billingCity}
                      onChangeText={(text) => handleFieldUpdate('billingCity', text)}
                      placeholder="Enter city"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="flag" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.billingState}
                      onChangeText={(text) => handleFieldUpdate('billingState', text)}
                      placeholder="Enter state"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Postal Code</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="hash" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.billingPostalCode}
                      onChangeText={(text) => handleFieldUpdate('billingPostalCode', text)}
                      placeholder="Enter postal code"
                      keyboardType="number-pad"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Country</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="globe" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.billingCountry}
                      onChangeText={(text) => handleFieldUpdate('billingCountry', text)}
                      placeholder="Enter country"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
            </View>
            {renderNextButton('emergencyContact')}
          </View>
        );
      case 'emergencyContact':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Emergency Contact</Text>
            <Text style={styles.sectionNote}>Do not list someone traveling with you</Text>
            <View style={styles.travelInfoGrid}>
              {/* Emergency Contact Inputs */}
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="user" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.emergencyLastName}
                      onChangeText={(text) => handleFieldUpdate('emergencyLastName', text)}
                      placeholder="Enter last name"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="user" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.emergencyFirstName}
                      onChangeText={(text) => handleFieldUpdate('emergencyFirstName', text)}
                      placeholder="Enter first name"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Relationship</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="users" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.emergencyRelationship}
                      onChangeText={(text) => handleFieldUpdate('emergencyRelationship', text)}
                      placeholder="Enter relationship"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.travelInfoRow}>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="phone" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.emergencyPhone}
                      onChangeText={(text) => handleFieldUpdate('emergencyPhone', text)}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
                <View style={styles.travelInfoField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="mail" size={isTablet ? 18 : 16} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={data.emergencyEmail}
                      onChangeText={(text) => handleFieldUpdate('emergencyEmail', text)}
                      placeholder="Enter email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
               <View style={styles.travelInfoRow}>
                <View style={[styles.travelInfoField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Accompanying Persons</Text>
                  <Text style={styles.fieldSubLabel}>List any minor children or incapacitated/incompetent adults traveling with you</Text>
                  <View style={[styles.inputContainer, { height: 100 }]}>
                    <Feather name="users" size={isTablet ? 18 : 16} color="#8E8E93" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 12 }]} />
                    <TextInput
                      style={[styles.input, { height: '100%', textAlignVertical: 'top', paddingTop: 12 }]}
                      value={data.accompanyingPersons}
                      onChangeText={(text) => handleFieldUpdate('accompanyingPersons', text)}
                      placeholder="Enter names and ages of accompanying persons"
                      multiline
                      numberOfLines={4}
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                setShowSignature(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Text style={styles.continueButtonText}>Continue to Signature</Text>
              <Feather name="edit-2" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.sectionContainer}>
      {renderProgressBar()}
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

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    backgroundColor: '#f9f9fb',
    padding: 20,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: isTablet ? 14 : 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  formSection: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isTablet ? 24 : 20,
    shadowColor: '#AEAEB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  formSectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 16,
  },
  travelInfoGrid: {
    gap: 16,
  },
  travelInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  travelInfoField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  fieldSubLabel: {
    fontSize: isTablet ? 13 : 12,
    color: '#8E8E93',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    backgroundColor: '#F9F9FB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: isTablet ? 16 : 15,
    color: '#1c1c1e',
  },
  continueButton: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    marginRight: 8,
  },
  sectionNote: {
    fontSize: isTablet ? 14 : 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 16,
  },
});

export default TravelInfoSection; 