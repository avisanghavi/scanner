import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const EventSelector = ({ visible, onClose, onSelect, onCreateNew, events }) => {
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [animation, setAnimation] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [visible]);
  
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  
  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }

    try {
      setLoading(true);
      const eventData = {
        name: newEventName.trim(),
        description: newEventDescription.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const savedEvent = await onCreateNew(eventData);
      setNewEventName('');
      setNewEventDescription('');
      setShowCreateNew(false);
      onSelect(savedEvent); // Pass the created event back for selection
    } catch (e) {
      Alert.alert('Error', 'Failed to create event: ' + e.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible && animation.__getValue() === 0) return null; // Don't render if not visible and animation finished

  return (
    <Modal
      visible={visible}
      animationType="none" // Use Animated API instead
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalContent, 
                { transform: [{ translateY }] }
              ]}
            >
              <BlurView intensity={80} tint="light" style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showCreateNew ? 'Create New Event' : 'Select Event'}</Text>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                >
                  <Feather name="x" size={24} color="#8A8A8E" />
                </TouchableOpacity>
              </BlurView>
              
              {!showCreateNew ? (
                <>
                  <ScrollView 
                    style={styles.eventList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    {events && events.length > 0 ? (
                      events.map(event => (
                        <TouchableOpacity
                          key={event.id}
                          style={styles.eventItem}
                          onPress={() => {
                            onSelect(event);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#007AFF20', '#0A84FF05']}
                            style={styles.eventItemIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Feather name="folder" size={20} color="#0A84FF" />
                          </LinearGradient>
                          <View style={styles.eventItemTextContainer}>
                            <Text style={styles.eventName} numberOfLines={1}>
                              {event.name}
                            </Text>
                            <Text style={styles.eventDescription} numberOfLines={2}>
                              {event.description || 'No description'}
                            </Text>
                            <View style={styles.eventItemFooter}>
                              <Text style={styles.eventDate}>
                                {new Date(event.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                              <View style={styles.scanCountBadge}>
                                <Feather name="file-text" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.scanCountText}>
                                  {event.scans?.length || 0} scans
                                </Text>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noEventsModalContainer}>
                        <LottieView 
                          source={require('../../assets/empty-folder.json')} // Adjust path if needed
                          autoPlay 
                          loop 
                          style={{ width: isTablet ? 200 : 150, height: isTablet ? 200 : 150 }}
                        />
                        <Text style={styles.noEventsText}>No Events Found</Text>
                        <Text style={styles.noEventsSubtext}>Create an event to save scans to it.</Text>
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={styles.modalButtonPrimary}
                      onPress={() => {
                        setShowCreateNew(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Feather name="plus-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.modalButtonText}>Create New Event</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                  style={{ flex: 1 }}
                >
                  <ScrollView style={styles.createEventForm} keyboardShouldPersistTaps="handled">
                    <Text style={styles.modalLabel}>Event Name</Text>
                    <View style={styles.modalInputContainer}>
                      <Feather name="tag" size={18} color="#8E8E93" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g., Business Trip - Q3"
                        value={newEventName}
                        onChangeText={setNewEventName}
                        placeholderTextColor="#C7C7CC"
                      />
                    </View>
                    <Text style={styles.modalLabel}>Description (Optional)</Text>
                    <View style={[styles.modalInputContainer, { height: 100, alignItems: 'flex-start' }]}>
                      <Feather name="file-text" size={18} color="#8E8E93" style={{ marginRight: 10, marginTop: 12 }} />
                      <TextInput
                        style={[styles.modalInput, styles.modalTextArea]}
                        placeholder="Add a short description for this event"
                        value={newEventDescription}
                        onChangeText={setNewEventDescription}
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#C7C7CC"
                        textAlignVertical="top"
                      />
                    </View>
                    
                    <View style={styles.modalButtonContainerBottom}>
                      <TouchableOpacity
                        style={[styles.modalButtonPrimary, loading && styles.modalButtonDisabled]}
                        onPress={handleCreateEvent}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.modalButtonText}>Create Event</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalButtonSecondary}
                        onPress={() => {
                          setShowCreateNew(false);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        disabled={loading}
                      >
                        <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </KeyboardAvoidingView>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet ? 50 : 20,
  },
  modalContent: {
    backgroundColor: '#F9F9FB',
    borderRadius: isTablet ? 24 : 18,
    padding: 0,
    width: '100%',
    maxWidth: isTablet ? 650 : 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 28 : 20,
    paddingVertical: isTablet ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    // Remove background color to use BlurView
  },
  modalTitle: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalCloseButton: {
    padding: 4,
  },
  eventList: {
    paddingHorizontal: isTablet ? 28 : 20,
    paddingTop: isTablet ? 20 : 16,
    flexGrow: 0,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 14 : 10,
    padding: isTablet ? 18 : 14,
    marginBottom: isTablet ? 14 : 10,
    shadowColor: '#AEAEB2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  eventItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  eventItemTextContainer: {
    flex: 1,
  },
  eventName: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: isTablet ? 14 : 13,
    color: '#8A8A8E',
    marginBottom: 8,
    lineHeight: isTablet ? 20 : 18,
  },
  eventItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  eventDate: {
    fontSize: isTablet ? 13 : 11,
    color: '#AEAEB2',
  },
  scanCountBadge: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanCountText: {
    fontSize: isTablet ? 12 : 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noEventsModalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTablet ? 60 : 40,
    opacity: 0.8,
  },
  noEventsText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#3C3C43',
    textAlign: 'center',
    marginVertical: 8,
  },
  noEventsSubtext: {
    fontSize: isTablet ? 14 : 13,
    color: '#8A8A8E',
    textAlign: 'center',
  },
  modalButtonContainer: {
    padding: isTablet ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF', // Keep white for button area
  },
   modalButtonContainerBottom: { // Style specifically for create form buttons
    paddingTop: isTablet ? 16 : 12, // Add some space above buttons
    gap: isTablet ? 14 : 10,
  },
  modalButtonPrimary: {
    backgroundColor: '#0A84FF',
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: isTablet ? 14 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalButtonSecondary: {
    backgroundColor: '#E5E5EA',
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: isTablet ? 14 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
  },
  modalButtonSecondaryText: {
    color: '#0A84FF',
  },
  createEventForm: {
    padding: isTablet ? 28 : 20,
    flex: 1, // Allow form to take available space
  },
  modalLabel: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: '500',
      color: '#636366',
      marginBottom: 8,
      marginLeft: 4, 
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: isTablet ? 14 : 10,
    paddingHorizontal: isTablet ? 16 : 12,
    marginBottom: isTablet ? 20 : 16,
  },
  modalInput: {
    flex: 1,
    paddingVertical: isTablet ? 14 : 10,
    fontSize: isTablet ? 16 : 15,
    color: '#1C1C1E',
  },
  modalTextArea: {
    height: isTablet ? 100 : 80,
    textAlignVertical: 'top',
    paddingTop: isTablet ? 14 : 10,
  },
});

export default EventSelector; 