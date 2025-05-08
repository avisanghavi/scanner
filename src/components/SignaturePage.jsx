import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import SignatureScreen from 'react-native-signature-canvas';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const SignaturePage = ({ onSave, onCancel }) => {
  const [signature, setSignature] = useState(null);
  const signatureRef = useRef(null);
  const [instructionsVisible, setInstructionsVisible] = useState(true);

  // Animation references
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade out instructions after delay
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start(() => setInstructionsVisible(false));
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleSignature = (signatureData) => {
    setSignature(signatureData);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(signatureData);
  };

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
      setSignature(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleConfirm = () => {
    if (signatureRef.current) {
      signatureRef.current.readSignature();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleEmpty = () => {
    Alert.alert(
      'Signature Required',
      'Please provide your signature to continue.',
      [{ text: 'OK', style: 'default' }]
    );
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
    border-radius: 16px;
  }
  .m-signature-pad--body canvas {
    margin: 0;
    padding: 0;
    border-radius: 16px;
  }
  .m-signature-pad--footer {
    display: none;
  }`;

  return (
    <View style={styles.signaturePageContainer}>
      <BlurView intensity={90} style={styles.signaturePageHeader}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.signaturePageTitle}>Signature</Text>
        <View style={styles.headerSpacer} />
      </BlurView>

      <View style={styles.signaturePageContent}>
        <Text style={styles.signaturePageSubtitle}>
          Please sign below to confirm all information is accurate
        </Text>

        <View style={styles.signatureWrapper}>
          {instructionsVisible && (
            <Animated.View style={[styles.signatureInstructions, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}>
              <BlurView intensity={80} tint="light" style={styles.signatureInstructionsBlur}>
                <Feather name="edit-2" size={20} color="#007AFF" />
                <Text style={styles.signatureInstructionsText}>
                  Sign with your finger inside the box
                </Text>
              </BlurView>
            </Animated.View>
          )}
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
            <Feather name="trash-2" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  signaturePageContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  signaturePageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backButtonText: { // Note: This seems unused, maybe remove? Kept for now.
    fontSize: isTablet ? 28 : 24,
    color: '#007AFF',
    marginRight: 4,
  },
  backButtonLabel: {
    fontSize: isTablet ? 17 : 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  signaturePageTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  headerSpacer: {
    minWidth: 80,
  },
  signaturePageContent: {
    flex: 1,
    padding: 20,
  },
  signaturePageSubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  signatureWrapper: {
    flex: 1,
    height: isTablet ? 300 : 200,
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  signatureInstructions: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Adjust transform based on potential width
    transform: [
      { translateX: -150 }, // Assuming approx width of 300
      { translateY: -30 } // Approx half height
    ],
  },
  signatureInstructionsBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden', // Needed for BlurView borderRadius
  },
  signatureInstructionsText: {
    marginLeft: 8,
    fontSize: isTablet ? 16 : 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
  },
});

export default SignaturePage; 