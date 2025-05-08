import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import ResultRow from './ResultRow';
import ScanStatus from './ScanStatus';
import { formatMRZDate } from '../utils/mrzParser'; // Assuming utils path
import generateFormPDF from '../utils/pdfGenerator'; // Assuming utils path

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const ScanDetails = ({ scan, onBack }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await generateFormPDF(scan);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF: ' + error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Header */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={90} tint="light" style={styles.reviewHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backButtonLabel}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.reviewTitle} numberOfLines={1}>{scan.label || 'Scan Details'}</Text>
          <View style={styles.headerSpacer} />
        </BlurView>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView 
        style={styles.reviewScrollView}
        contentContainerStyle={{ paddingTop: 80 }} // Start content below initial header space
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.reviewContent}>
          <View style={styles.reviewTitleContainer}>
            <Text style={styles.reviewDetailTitle}>{scan.label || 'Scan Details'}</Text>
            <Text style={styles.reviewDetailDate}>
              {new Date(scan.savedAt).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
          
          {/* Document Information Section */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="file-text" size={22} color="#0A84FF" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Document Information</Text>
              </View>
              {scan.confidence !== undefined && scan.confidence !== null && (
                <ScanStatus confidence={scan.confidence} />
              )}
            </View>
            <View style={styles.reviewCard}>
              <ResultRow label="Document Type" value={scan.documentType} icon="file-text" iconColor="#0A84FF" />
              <ResultRow label="Surname" value={scan.surname} icon="user" iconColor="#FF9500" />
              <ResultRow label="First Name" value={scan.firstName} icon="user" iconColor="#FF9500" />
              <ResultRow label="Middle Name" value={scan.middleName} icon="user" iconColor="#FF9500" />
              <ResultRow label="Passport Number" value={scan.documentNumber} icon="hash" iconColor="#34C759" />
              <ResultRow label="Nationality" value={scan.nationality} icon="flag" iconColor="#FF2D55" />
              <ResultRow label="Date of Birth" value={formatMRZDate(scan.dateOfBirth, false)} icon="calendar" iconColor="#5856D6" />
              <ResultRow label="Sex" value={scan.sex} icon="user" iconColor="#FF9500" />
              <ResultRow label="Expiry Date" value={formatMRZDate(scan.expiryDate, true)} icon="calendar" iconColor="#5856D6" />
              <ResultRow label="Issuing Country" value={scan.issuingCountry} icon="globe" iconColor="#FF2D55" />
            </View>
          </View>

          {/* Travel Information Section */}
          {(scan.carrier || scan.flightNumber || scan.dateOfFlight) && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="navigation" size={22} color="#FF9500" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Travel Information</Text>
              </View>
              <View style={styles.reviewCard}>
                <ResultRow label="Carrier" value={scan.carrier} icon="navigation" iconColor="#0A84FF" />
                <ResultRow label="Routing" value={scan.routing} icon="map" iconColor="#34C759" />
                <ResultRow label="Flight Number" value={scan.flightNumber} icon="hash" iconColor="#FF9500" />
                <ResultRow label="Date of Flight" value={scan.dateOfFlight} icon="calendar" iconColor="#5856D6" />
                <ResultRow label="Seats" value={scan.seats} icon="pocket" iconColor="#FF2D55" />
                <ResultRow label="Meal" value={scan.meal} icon="coffee" iconColor="#8E8E93" />
              </View>
            </View>
          )}
          
          {/* Add other sections similarly... */}
          {/* Personal Information Section */} 
          {(scan.birthCity || scan.birthState || scan.birthCountry || scan.ssn) && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                 <Feather name="user" size={22} color="#34C759" style={{ marginRight: 10 }} />
                 <Text style={styles.reviewSectionTitle}>Personal Information</Text>
              </View>
              <View style={styles.reviewCard}>
                <ResultRow label="Place of Birth (City)" value={scan.birthCity} icon="map-pin" iconColor="#FF9500" />
                <ResultRow label="State/Province" value={scan.birthState} icon="flag" iconColor="#FF2D55" />
                <ResultRow label="Country" value={scan.birthCountry} icon="globe" iconColor="#5856D6" />
                <ResultRow label="Social Security Number" value={scan.ssn ? '***-**-****' : 'N/A'} icon="lock" iconColor="#8E8E93" />
              </View>
            </View>
          )}
          
          {/* Current Lodging Section */}
          {(scan.currentLodging || scan.phoneNumber || scan.email) && (
            <View style={styles.reviewSection}>
               <View style={styles.reviewSectionTitleContainer}>
                <Feather name="home" size={22} color="#FF2D55" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Current Lodging</Text>
               </View>
              <View style={styles.reviewCard}>
                <ResultRow label="Current Lodging" value={scan.currentLodging} icon="home" iconColor="#0A84FF" />
                <ResultRow label="Phone Number" value={scan.phoneNumber} icon="phone" iconColor="#34C759" />
                <ResultRow label="Email" value={scan.email} icon="mail" iconColor="#FF9500" />
              </View>
            </View>
          )}

          {/* Medical Condition Section */}
          {scan.medicalConditions && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="activity" size={22} color="#5856D6" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Medical Condition</Text>
              </View>
              <View style={styles.reviewCard}>
                <ResultRow 
                  label="Medical Condition" 
                  value={scan.medicalConditions || 'None reported'} 
                  icon="activity"
                  iconColor="#FF2D55"
                />
              </View>
            </View>
          )}

          {/* Billing Address Section */}
          {(scan.billingAddress1 || scan.billingCity || scan.billingCountry || scan.billingPostalCode || scan.billingPhone || scan.billingEmail) && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="credit-card" size={22} color="#8E8E93" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Billing Address</Text>
              </View>
              <View style={styles.reviewCard}>
                <ResultRow label="Address Line 1" value={scan.billingAddress1} icon="map-pin" iconColor="#0A84FF" />
                <ResultRow label="Address Line 2" value={scan.billingAddress2} icon="map-pin" iconColor="#0A84FF" />
                <ResultRow label="City" value={scan.billingCity} icon="navigation" iconColor="#34C759" />
                <ResultRow label="Country" value={scan.billingCountry} icon="globe" iconColor="#FF2D55" />
                <ResultRow label="Postal Code" value={scan.billingPostalCode} icon="hash" iconColor="#FF9500" />
                <ResultRow label="Phone" value={scan.billingPhone} icon="phone" iconColor="#5856D6" />
                <ResultRow label="Email" value={scan.billingEmail} icon="mail" iconColor="#8E8E93" />
              </View>
            </View>
          )}

          {/* Emergency Contact Section */}
          {(scan.emergencyLastName || scan.emergencyFirstName || scan.emergencyAddress1 || scan.emergencyPhone || scan.emergencyEmail) && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="users" size={22} color="#FF9500" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Emergency Contact</Text>
              </View>
              <Text style={styles.sectionNote}>Person not traveling with you</Text>
              <View style={styles.reviewCard}>
                <ResultRow label="Last Name" value={scan.emergencyLastName} icon="user" iconColor="#0A84FF" />
                <ResultRow label="First Name" value={scan.emergencyFirstName} icon="user" iconColor="#0A84FF" />
                <ResultRow label="Address Line 1" value={scan.emergencyAddress1} icon="map-pin" iconColor="#34C759" />
                <ResultRow label="Address Line 2" value={scan.emergencyAddress2} icon="map-pin" iconColor="#34C759" />
                <ResultRow label="City" value={scan.emergencyCity} icon="navigation" iconColor="#FF9500" />
                <ResultRow label="State/Province" value={scan.emergencyState} icon="flag" iconColor="#FF2D55" />
                <ResultRow label="Country" value={scan.emergencyCountry} icon="globe" iconColor="#5856D6" />
                <ResultRow label="Phone" value={scan.emergencyPhone} icon="phone" iconColor="#8E8E93" />
                <ResultRow label="Email" value={scan.emergencyEmail} icon="mail" iconColor="#0A84FF" />
              </View>
            </View>
          )}
          
          {/* Accompanying Persons Section */}
          {scan.accompanyingPersons && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="users" size={22} color="#34C759" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Accompanying Persons</Text>
              </View>
              <Text style={styles.sectionNote}>Minor children or incapacitated/incompetent adults traveling with you</Text>
              <View style={styles.reviewCard}>
                <ResultRow 
                  label="Accompanying Persons" 
                  value={scan.accompanyingPersons || 'None'} 
                  icon="users"
                  iconColor="#0A84FF" 
                />
              </View>
            </View>
          )}

          {/* Signature Section */}
          {scan.signature && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionTitleContainer}>
                <Feather name="edit-2" size={22} color="#FF2D55" style={{ marginRight: 10 }} />
                <Text style={styles.reviewSectionTitle}>Signature</Text>
              </View>
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
        </View>
      </Animated.ScrollView>
      
      <BlurView intensity={90} tint="light" style={styles.pdfButtonContainer}>
        <TouchableOpacity
          style={[styles.pdfButton, isGeneratingPDF && styles.pdfButtonDisabled]}
          onPress={handleGeneratePDF}
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="file-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.pdfButtonText}>Generate DS-3072 Form</Text>
            </>
          )}
        </TouchableOpacity>
      </BlurView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : (isTablet ? 50 : 44), // Adjust for safe area
    paddingBottom: 16,
    // Remove background color and border as BlurView provides the effect
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
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
    fontSize: isTablet ? 18 : 17,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  reviewScrollView: {
    flex: 1,
    backgroundColor: 'transparent', // Let container background show
  },
  reviewContent: {
    padding: 20,
    paddingTop: isTablet ? 60 : 50, // Initial padding to avoid content under initial non-blurred header space
  },
  reviewTitleContainer: {
    marginBottom: 24,
  },
  reviewDetailTitle: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  reviewDetailDate: {
    fontSize: isTablet ? 16 : 14,
    color: '#8E8E93',
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
  reviewSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewSectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 16 : 12,
    shadowColor: '#AEAEB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
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
  pdfButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  pdfButton: {
    backgroundColor: '#FF9500', // Orange for PDF generation
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  pdfButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
  },
  sectionNote: {
    fontSize: isTablet ? 14 : 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  // Assuming ResultRow styles are imported
  // Assuming ScanStatus styles are imported
});

export default ScanDetails; 