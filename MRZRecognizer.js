import { NativeModules, NativeEventEmitter } from 'react-native';

class MRZRecognizer {
  constructor() {
    this.onImageRead = null;
    this.isScanning = false;
    this.eventEmitter = new NativeEventEmitter(NativeModules.MRZScanner);
  }

  async startScanning() {
    try {
      this.isScanning = true;
      await NativeModules.MRZScanner.startScanning();
      
      // Set up event listener for scan results
      this.eventEmitter.addListener('onImageRead', (results) => {
        if (this.onImageRead && this.isScanning) {
          this.onImageRead(results);
        }
      });
    } catch (error) {
      console.error('Error starting MRZ scanner:', error);
      throw error;
    }
  }

  async stopScanning() {
    try {
      this.isScanning = false;
      await NativeModules.MRZScanner.stopScanning();
      this.eventEmitter.removeAllListeners('onImageRead');
    } catch (error) {
      console.error('Error stopping MRZ scanner:', error);
      throw error;
    }
  }
}

export default MRZRecognizer; 