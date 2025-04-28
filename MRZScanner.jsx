import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Image, Platform, StatusBar } from 'react-native';
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

export default function MRZScanner({ onMRZRead, onClose }) {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1680/1680012.png' }}
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorText}>
          Please enable camera access in your device settings to use the MRZ scanner.
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={onClose}>
          <Text style={styles.errorButtonText}>Close Scanner</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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

      if (data.type === 'success' && data.data && data.data.mrzText) {
        // Send the raw MRZ text to the parent component
        onMRZRead(data.data.mrzText);
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

  const parseMRZ = (mrzText) => {
    try {
      if (!mrzText || typeof mrzText !== 'string') {
        console.error('Invalid MRZ text:', mrzText);
        return null;
      }

      // Clean the MRZ text
      const cleanText = mrzText.replace(/\s/g, '').toUpperCase();
      console.log("Cleaned MRZ Text:", cleanText);

      // Split into lines if it's a single line
      let lines;
      if (cleanText.includes('\n')) {
        lines = cleanText.split('\n');
      } else {
        // For single line, split at position 44 (standard MRZ format)
        lines = [
          cleanText.substring(0, 44),
          cleanText.substring(44)
        ];
      }

      console.log("Split Lines:", lines);

      if (lines.length < 2) {
        console.error('Not enough lines in MRZ text');
        return null;
      }

      const line1 = lines[0];
      const line2 = lines[1];

      console.log("Line 1:", line1);
      console.log("Line 2:", line2);

      // Extract document type and country code
      const documentType = line1.substring(0, 2).trim();
      const countryCode = line1.substring(2, 5).trim();
      
      // Extract name parts
      const nameParts = line1.substring(5).split('<<').filter(Boolean);
      const surname = nameParts[0]?.replace(/</g, ' ').trim() || '';
      const givenNames = nameParts[1]?.replace(/</g, ' ').trim() || '';
      
      // Extract data from line 2
      const documentNumber = line2.substring(0, 9).trim();
      const nationality = line2.substring(10, 13).trim();
      const birthDate = line2.substring(13, 19).trim();
      const sex = line2.substring(20, 21).trim();
      const expiryDate = line2.substring(21, 27).trim();
      const personalNumber = line2.substring(28, 42).trim();
      const checkDigits = line2.substring(42).trim();

      // Format dates
      const formatDate = (dateStr) => {
        if (!dateStr || dateStr.length !== 6) return '';
        const year = parseInt(dateStr.substring(0, 2));
        const month = dateStr.substring(2, 4);
        const day = dateStr.substring(4, 6);
        return '20' + year + '-' + month + '-' + day;
      };

      const parsedData = {
        documentType,
        countryCode,
        surname,
        givenNames,
        documentNumber,
        nationality,
        birthDate: formatDate(birthDate),
        sex,
        expiryDate: formatDate(expiryDate),
        personalNumber,
        checkDigits,
        mrzText: cleanText
      };

      console.log("Final Parsed Data:", parsedData);
      return parsedData;
    } catch (error) {
      console.error('Error parsing MRZ:', error);
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MRZ Scanner</Text>
      </View>
      <WebView
        style={styles.webview}
        source={{ 
          html: htmlContent,
          baseUrl: 'https://dynamsoft.com'
        }}
        onMessage={handleMessage}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        useWebKit={true}
        onShouldStartLoadWithRequest={() => true}
        startInLoadingState={true}
        bounces={false}
        scrollEnabled={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error:', nativeEvent);
        }}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Position the MRZ zone within the frame
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    tintColor: '#FF3B30',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorButtonText: {
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
  closeButton: {
    position: 'absolute',
    left: 20,
    padding: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
});