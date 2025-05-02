import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

// Helper function to format date from YYMMDD or other formats to MM/DD/YYYY
const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  
  // Check if already in MM/DD/YYYY format (or similar)
  if (dateStr.includes('/') || dateStr.includes('-')) {
      try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
          }
      } catch (e) {
          // Ignore parsing errors, fall through
      }
  }

  // Handle YYMMDD format
  if (dateStr.length === 6 && /^\d+$/.test(dateStr)) {
    const year = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    
    let fullYear;
    const currentYearLastTwoDigits = new Date().getFullYear() % 100;
    // Heuristic: if YY is greater than current year + 10, assume 19YY, otherwise 20YY
    fullYear = parseInt(year) > (currentYearLastTwoDigits + 10) ? `19${year}` : `20${year}`;
    
    // Validate month and day
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        return `${month}/${day}/${fullYear}`;
    }
  }
  
  console.warn(`Could not format date: ${dateStr}`);
  return dateStr; // Return original if formatting fails
};

const fillPdfForm = async (scanData) => {
  try {
    console.log('Starting PDF generation with scan data:', scanData);

    // --- 1. Load PDF Template ---
    const templateAsset = Asset.fromModule(require('../../assets/DS3.pdf'));
    await templateAsset.downloadAsync(); // Ensure asset is downloaded

    const templateUri = templateAsset.localUri || templateAsset.uri;
    console.log('Template URI:', templateUri);
    
    // Read the template file as base64
    const templateBytesBase64 = await FileSystem.readAsStringAsync(templateUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    console.log('Template loaded (Base64 size):', templateBytesBase64.length);

    // Load the PDF document using pdf-lib
    const pdfDoc = await PDFDocument.load(templateBytesBase64);
    console.log('PDF document loaded. Pages:', pdfDoc.getPageCount());

    // Get the form from the document
    const form = pdfDoc.getForm();
    console.log('PDF form obtained.');

    // --- 2. Map Scan Data to Form Fields ---
    // Construct full name, handling potential missing middle name
    const fullNameParts = [scanData.firstName, scanData.middleName, scanData.surname].filter(Boolean);
    const fullName = fullNameParts.join(' ');

    // Get current date and format it
    const currentDate = new Date();
    const currentDateFormatted = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}/${currentDate.getFullYear()}`;
    
    const placeOfBirth = [
      scanData.birthCity || '',
      scanData.birthState || '',
      scanData.birthCountry || ''
    ].filter(Boolean).join(', ');
    
    const fieldMapping = {
      // Page 1 Fields
      'LName': scanData.surname,                                // 6 0 obj
      'FName': scanData.firstName,                              // 9 0 obj
      'MName': scanData.middleName,                             // 11 0 obj
      'Edit49': scanData.ssn,                                   // 13 0 obj (Item 4 SSN)
      'DOB': formatDate(scanData.dateOfBirth),                  // 18 0 obj (Item 5 Date of Birth)
      'POB': placeOfBirth,                                      // 22 0 obj (Item 6 Place of Birth - combined)
      'Coun': scanData.issuingCountry,                          // 36 0 obj (Visually Issuing Country)
      'Edit66': scanData.documentNumber,                         // 41 0 obj (Visually Passport No.)
      'Lodg': scanData.currentLodging,                          // 53 0 obj (Item 10a Current Lodging)
      'Phone': scanData.phoneNumber,                            // 56 0 obj (Item 10b Current Phone)
      'Email': scanData.email,                                  // 59 0 obj (Item 10c Current Email)
      'Edit35': scanData.medicalConditions,                     // 62 0 obj (Item 11 Medical Conditions)
      'one': scanData.billingAddress1,                          // 65 0 obj (Item 14 Billing Address 1)
      'two': scanData.billingAddress2,                          // 68 0 obj (Item 15 Billing Address 2)
      'cit': scanData.billingCity,                              // 71 0 obj (Item 16 Billing City)
      'state': scanData.billingState,                           // 74 0 obj (Item 17 Billing State)
      'Countr': scanData.billingCountry,                        // 77 0 obj (Item 18 Billing Country)
      'Post': scanData.billingPostalCode,                       // 80 0 obj (Item 19 Billing Postal Code)
      'tele': scanData.billingPhone,                            // 83 0 obj (Item 20 Billing Phone)
      'Em': scanData.billingEmail,                              // 86 0 obj (Item 21 Billing Email)
      'LN': scanData.emergencyLastName,                         // 89 0 obj (Item 23 Emergency Contact Last Name)
      'FN': scanData.emergencyFirstName,                        // 91 0 obj (Item 24 Emergency Contact First Name)
      'Add': scanData.emergencyAddress1,                        // 93 0 obj (Item 25 Emergency Contact Address 1)
      'Edit39': scanData.emergencyAddress2,                     // 96 0 obj (Item 26 Emergency Contact Address 2)
      'Ci': scanData.emergencyCity,                             // 99 0 obj (Item 27 Emergency Contact City)
      'S': scanData.emergencyState,                             // 101 0 obj (Item 28 Emergency Contact State)
      'count': scanData.emergencyCountry,                       // 103 0 obj (Item 29 Emergency Contact Country)
      'Pc': scanData.emergencyPostalCode,                       // 105 0 obj (Item 30 Emergency Contact Postal Code)
      'Tel': scanData.emergencyPhone,                           // 107 0 obj (Item 31 Emergency Contact Phone)
      'Ema': scanData.emergencyEmail,                           // 109 0 obj (Item 32 Emergency Contact Email)
      'rel': scanData.emergencyRelationship,                    // 111 0 obj (Item 33 Emergency Contact Relationship)
      'Edit20': scanData.accompanyingPersons,                   // 212 0 obj (Item 34 Accompanying Persons)

      // Page 2 Signature Block Fields (Corrected Names)
      'AppFullName': fullName, // Box 91 Full Name Printed (Object 148)
      'AppSign': fullName,     // Box 92 Signature (Typed) (Object 149)
      'SpouseDate': currentDateFormatted, // Box 93 Date (Object 150)
    };
    
    console.log('Filling text fields including corrected name and date for signature block...');
    Object.entries(fieldMapping).forEach(([fieldName, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') { // Check for non-empty strings
            try {
                const field = form.getTextField(fieldName);
                field.setText(String(value));
                console.log(`Set field "${fieldName}" to: ${String(value).substring(0, 50)}...`); // Log success
            } catch (e) {
                // This warning is crucial for debugging!
                console.warn(`Could not find or set text field: "${fieldName}" - ${e.message}`);
            }
        }
    });

    // Handle Sex (Item 8?) Checkboxes
    try {
        if (scanData.sex === 'M') {
            form.getCheckBox('M').check(); // Use 'M' from 43 0 obj
            console.log('Checked "M" checkbox.');
        } else if (scanData.sex === 'F') {
            form.getCheckBox('F').check(); // Use 'F' from 48 0 obj
            console.log('Checked "F" checkbox.');
        }
    } catch (e) {
        console.warn(`Could not set Sex checkbox: ${e.message}`);
        // Note: Radio button groups were not clearly identified in the provided objects
    }

    // Handle Document Type (Item 7) Checkboxes
    try {
      const docType = scanData.documentType?.trim() || ''; // Ensure it's a string and trimmed
      console.log(`Evaluating Document Type for checkbox: "${docType}"`); // Log the value

      if (docType === 'P' || docType === 'P<') { // Check for 'P' or 'P<'
        form.getCheckBox('Pass').check(); // Use 'Pass' from 25 0 obj
        console.log('Checked "Pass" checkbox.');
      } else {
        form.getCheckBox('ID').check(); // Use 'ID' from 31 0 obj
        console.log('Checked "ID" checkbox.');
      }
    } catch (e) {
      console.warn(`Could not set Document Type checkbox: ${e.message} - Field names 'Pass' or 'ID' might be incorrect for this template.`);
      // Note: Radio button groups were not clearly identified
    }

    // Handle Accompanying Persons None Checkbox (Item 34)
    try {
        if (!scanData.accompanyingPersons || scanData.accompanyingPersons.trim() === '') {
            form.getCheckBox('Checkbox11').check(); // Use 'Checkbox11' from 114 0 obj
            console.log('Checked "None" checkbox for accompanying persons.');
        }
    } catch(e) {
        console.warn(`Could not set "None" checkbox (Checkbox11): ${e.message}`);
    }

    // --- 3. Embed Signature ---
    // WARNING: No explicit signature field was identified in the provided Page 1 objects.
    // Using the placeholder name 'Signature'. Verify this field name exists in your PDF template.
    const signatureFieldName = 'Signature';
    if (scanData.signature) {
      console.log('Signature found, attempting to embed into field:', signatureFieldName);
      try {
        if (scanData.signature.startsWith('data:image/png;base64,')) {
          const base64Data = scanData.signature.split(',')[1];
          // Ensure Buffer polyfill if needed (see comment at end of file)
          const pngBytes = Buffer.from(base64Data, 'base64');
          const pngImage = await pdfDoc.embedPng(pngBytes);

          // Attempt to get the field as a button (common for image signatures)
          const sigField = form.getButton(signatureFieldName);
          sigField.setImage(pngImage);
          console.log('Signature embedded successfully into button field:', signatureFieldName);
        } else {
           console.warn('Signature format is not a PNG data URI.');
        }
      } catch (e) {
        console.error(`Failed to embed signature into field "${signatureFieldName}": ${e.message}. Does this field exist and is it a Button field?`);
        // Add fallback text? (Requires a text field for fallback)
        // try {
        //     form.getTextField('Signature_Fallback_Text').setText('Signature provided but could not be embedded.');
        // } catch (fallbackError) {}
      }
    } else {
       console.log('No signature provided.');
    }

    // --- 4. Flatten form fields (Optional) ---
    // form.flatten(); // Uncomment this to make fields non-editable after filling

    // --- 5. Save the Modified Document ---
    console.log('Saving modified PDF...');
    // Save as Base64 string for FileSystem
    const pdfBytesBase64 = await pdfDoc.saveAsBase64({ dataUri: false });
    console.log('PDF saved to Base64.');

    // --- 6. Write PDF to File ---
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    const filename = `DS-3072_${scanData.surname || 'Scan'}_${timestamp}.pdf`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    
    console.log(`Writing PDF to: ${filePath}`);
    await FileSystem.writeAsStringAsync(filePath, pdfBytesBase64, {
      encoding: FileSystem.EncodingType.Base64
    });
    console.log('PDF written to file system.');

    // --- 7. Share the PDF ---
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      console.log('Sharing PDF...');
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Completed DS-3072 Form',
        UTI: 'com.adobe.pdf' // iOS specific UTI
      });
      console.log('PDF shared.');
    } else {
       console.log('Sharing is not available on this platform.');
       // Optionally alert the user the file was saved locally
       alert(`PDF saved locally at: ${filePath}`);
    }

    return filePath; // Return the path to the saved file

  } catch (error) {
    console.error('Error generating PDF:', error);
    // Provide more specific error feedback if possible
    alert(`Failed to generate PDF: ${error.message}`); 
    throw error; // Re-throw the error for further handling if needed
  }
};

// Export the function with the original name expected by App.jsx
export default fillPdfForm;

// Add Buffer polyfill if running in an environment where it's not standard (like some RN setups)
// npm install buffer --save
// import { Buffer } from 'buffer';
// global.Buffer = Buffer; // Make Buffer globally available if needed