# MRZ Scanner App

A React Native application for scanning and parsing Machine Readable Zone (MRZ) data from passports and ID cards using Dynamsoft's Label Recognizer.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Git

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone [your-repository-url]
   cd [repository-name]
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Assets**
   - Ensure the `assets/images` directory contains:
     - dynamsoft-logo.png
     - mrz-sample.png
     - scanner-icon.png

4. **Start the Development Server**
   ```bash
   npx expo start
   ```

5. **Run on Device**
   - Install Expo Go app on your iOS/Android device
   - Scan the QR code shown in the terminal
   - OR run in web browser by pressing 'w'

## Platform-Specific Notes

### Windows
- Install Android Studio for Android development
- Use Windows PowerShell or Command Prompt as terminal
- For web development, use Chrome or Edge browser
- If using WSL2, ensure proper setup for React Native development

### macOS
- Install Xcode for iOS development
- Use Terminal app
- For web development, any modern browser works

## Troubleshooting

- If camera access is denied, check app permissions
- If scanner doesn't initialize, check internet connection for first-time SDK download
- For Windows-specific issues, ensure proper environment variables are set

## License

This project uses Dynamsoft Label Recognizer. Ensure you have a valid license key configured in MRZScanner.jsx.

## Support

For issues and questions, please open a GitHub issue in this repository.
