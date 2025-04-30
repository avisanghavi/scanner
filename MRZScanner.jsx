import React, { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Image, Platform, StatusBar, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

const htmlContent = String.raw`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
    <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.20/dist/dbr.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@3.3.4/dist/dce.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer@2.2.31/dist/dlr.js"></script>
    <title>MRZ Scanner</title>
    <style>
      body { margin: 0; padding: 0; overflow: hidden; }
      .app { 
        width: 100vw; 
        height: 100vh; 
        position: relative;
        background: #000;
      }
      .dce-video-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
      }
      .dce-scanarea {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        height: 120px;
        border: 2px solid #fff;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      }
      .status {
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.8);
        padding: 10px;
        border-radius: 5px;
        z-index: 1000;
      }
    </style>
  </head>
  <body>
    <div class="app">
      <div class="status">Initializing...</div>
      <div class="dce-video-container"></div>
      <div class="dce-scanarea"></div>
    </div>
    <script>
      let enhancer;
      let recognizer;
      let scanning = false;
      
      async function initScanner() {
        try {
          updateStatus("Initializing...");
          
          // Initialize Dynamsoft License
          Dynamsoft.DLR.LabelRecognizer.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzOTUxMDE2LVRYbFFjbTlxIiwibWFpblNlcnZlclVSTCI6Imh0dHBzOi8vbWRscy5keW5hbXNvZnRvbmxpbmUuY29tIiwib3JnYW5pemF0aW9uSUQiOiIxMDM5NTEwMTYiLCJzdGFuZGJ5U2VydmVyVVJMIjoiaHR0cHM6Ly9zZGxzLmR5bmFtc29mdG9ubGluZS5jb20iLCJjaGVja0NvZGUiOi0yMjc3NDQzODN9';
          Dynamsoft.DLR.LabelRecognizer.organizationID = "103951016";

          // Initialize camera enhancer
          enhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance();
          await enhancer.setUIElement(document.querySelector(".dce-video-container"));
          
          // Initialize label recognizer
        recognizer = await Dynamsoft.DLR.LabelRecognizer.createInstance();
          
          // Set MRZ recognition settings
          await recognizer.updateRuntimeSettingsFromString("MRZ");
          
          // Set up video scanning
          recognizer.setImageSource(enhancer);
          
          // Set up result callback
          recognizer.onImageRead = async (results) => {
            if (!scanning) return;
            
            try {
              if (results.length > 0) {
                const mrzResult = results[0];
                console.log("Raw MRZ Result:", mrzResult);
                
                if (mrzResult.lineResults && mrzResult.lineResults.length > 0) {
                  // Extract MRZ lines and clean them
                  const lines = mrzResult.lineResults
                    .map(line => line.text)
                    .filter(text => text && typeof text === 'string')
                    .map(text => text.replace(/\s/g, '').toUpperCase());
                  
                  console.log("Cleaned MRZ Lines:", lines);
                  
                  if (lines.length >= 2) {
                    const line1 = lines[0];
                    const line2 = lines[1];
                    
                    console.log("Line 1:", line1);
                    console.log("Line 2:", line2);
                    
                    // Basic validation of MRZ format
                    if (line1.length >= 30 && line2.length >= 30) {
                      // Create combined MRZ text
                      const combinedMrzText = lines.join('\n');
                      
                      const mrzData = {
                        type: 'success',
                        data: {
                          mrzText: combinedMrzText,
                          confidence: mrzResult.confidence,
                          rawLines: lines
                        }
                      };
                      
                      console.log("Sending MRZ Data:", mrzData);
                      
                      // Stop scanning and send result
                      scanning = false;
                      await recognizer.stopScanning();
                      
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify(mrzData));
                      }
                      
                      updateStatus("MRZ Found!");
                    } else {
                      console.log("MRZ lines are not the expected length");
                      updateStatus("Invalid MRZ format");
                    }
                  } else {
                    console.log("Not enough valid MRZ lines detected");
                    updateStatus("Invalid MRZ format");
                  }
                }
              }
            } catch (error) {
              console.error("Error processing result:", error);
              updateStatus("Error: " + error.message);
              
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  error: error.message
                }));
              }
            }
          };
          
          // Start scanning
          scanning = true;
          await recognizer.startScanning(true);
          
          // Open camera
          await enhancer.open();
          updateStatus("Scanning...");
          
        } catch (error) {
          console.error("Scanner initialization error:", error);
          updateStatus("Error: " + error.message);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: error.message
            }));
          }
        }
      }

      function updateStatus(message) {
        document.querySelector(".status").textContent = message;
      }

      // Initialize when page loads
      window.addEventListener('DOMContentLoaded', initScanner);

      // Cleanup function
      window.addEventListener('beforeunload', async () => {
        if (scanning) {
          scanning = false;
          if (recognizer) {
            await recognizer.stopScanning();
          }
        }
        if (enhancer) {
          await enhancer.close();
        }
      });
    </script>
  </body>
</html>`;

const TravelInfoSection = ({ data, onUpdate }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>Travel Information</Text>
    <View style={styles.travelInfoGrid}>
      <View style={styles.travelInfoRow}>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Carrier</Text>
          <TextInput
            style={styles.input}
            value={data.carrier}
            onChangeText={(text) => onUpdate({ ...data, carrier: text })}
            placeholder="Enter carrier"
          />
        </View>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Routing</Text>
          <TextInput
            style={styles.input}
            value={data.routing}
            onChangeText={(text) => onUpdate({ ...data, routing: text })}
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
            onChangeText={(text) => onUpdate({ ...data, flightNumber: text })}
            placeholder="Enter flight number"
          />
        </View>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Date of Flight</Text>
          <TextInput
            style={styles.input}
            value={data.dateOfFlight}
            onChangeText={(text) => onUpdate({ ...data, dateOfFlight: text })}
            placeholder="DD/MM/YYYY"
          />
        </View>
      </View>
      <View style={styles.travelInfoRow}>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Seats</Text>
          <TextInput
            style={styles.input}
            value={data.seats}
            onChangeText={(text) => onUpdate({ ...data, seats: text })}
            placeholder="Enter seat numbers"
          />
        </View>
        <View style={styles.travelInfoField}>
          <Text style={styles.fieldLabel}>Assistance Request</Text>
          <TextInput
            style={styles.input}
            value={data.assistanceRequest}
            onChangeText={(text) => onUpdate({ ...data, assistanceRequest: text })}
            placeholder="Enter assistance needs"
          />
        </View>
      </View>
      <View style={styles.travelInfoRow}>
        <View style={[styles.travelInfoField, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Remarks</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={data.remarks}
            onChangeText={(text) => onUpdate({ ...data, remarks: text })}
            placeholder="Enter any additional remarks"
            multiline={true}
            numberOfLines={3}
          />
        </View>
      </View>
    </View>
  </View>
);

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
    // Add new scan
    existing.push(scanData);
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(existing, null, 2));
    alert('Scan saved!');
  } catch (e) {
    alert('Failed to save scan: ' + e.message);
  }
};

const MRZScanner = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleMessage = (event) => {
    const message = event.nativeEvent.data;
    console.log("Received message:", message);
    
    try {
      if (message === "close") {
        onClose();
        return;
      }

      // Parse the JSON message
      const data = JSON.parse(message);
      console.log("Parsed JSON:", data);

      if (data.type === 'success' && data.data) {
        // Pass the entire data object to the parent component
        onScan(data.data);
      } else {
        console.error("Invalid data structure:", data);
        Alert.alert(
          "Data Error",
          "Invalid data structure received",
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error("Error handling message:", e);
      Alert.alert(
        "Processing Error", 
        "Error processing scan result: " + e.message, 
        [{ text: 'OK' }]
      );
    }
  };

  const handleError = (error) => {
    console.error('WebView error:', error);
    setError('Failed to load scanner');
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ 
          html: htmlContent,
          baseUrl: 'https://dynamsoft.com'
        }}
        style={styles.webview}
        onMessage={handleMessage}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        useWebKit={true}
        onShouldStartLoadWithRequest={() => true}
        bounces={false}
        scrollEnabled={false}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading scanner...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setError(null)}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    padding: 20,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  travelInfoGrid: {
    gap: 16,
  },
  travelInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  travelInfoField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
});

export default MRZScanner;