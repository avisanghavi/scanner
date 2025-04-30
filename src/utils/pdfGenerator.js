import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Helper function to format date from YYMMDD to mm-dd-yyyy
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // Handle different date formats
  if (dateString.includes('/')) {
    // Already formatted as DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[1]}-${parts[0]}-${parts[2]}`;
    }
    return dateString;
  }
  
  // If in YYMMDD format (like '740812')
  if (dateString.length === 6) {
    const year = dateString.substring(0, 2);
    const month = dateString.substring(2, 4);
    const day = dateString.substring(4, 6);
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${month}-${day}-${fullYear}`;
  }
  
  return dateString;
};

const generateFormPDF = async (scanData) => {
  try {
    // Format birth date if available
    const formattedBirthDate = formatDate(scanData.dateOfBirth);
    
    // Determine document type
    const isPassport = scanData.documentType === 'P' || scanData.documentType === 'Passport';
    
    // Format sex checkbox selections
    const maleChecked = scanData.sex === 'M' ? 'checked' : '';
    const femaleChecked = scanData.sex === 'F' ? 'checked' : '';
    
    // Full place of birth combines city, state, country
    const placeOfBirth = [
      scanData.birthCity || '',
      scanData.birthState || '',
      scanData.birthCountry || ''
    ].filter(Boolean).join(', ');
    
    // Combine emergency contact name
    const emergencyContactName = [scanData.emergencyFirstName, scanData.emergencyLastName]
      .filter(Boolean)
      .join(' ');
      
    // Format place of birth for form field #6
    const formattedPlaceOfBirth = placeOfBirth || `${scanData.birthCity || ''}, ${scanData.birthState || ''}, ${scanData.birthCountry || ''}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page {
              size: letter;
              margin: 0.5in;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              position: relative;
            }
            .header-left {
              position: absolute;
              left: 0;
              top: 0;
            }
            .header-right {
              position: absolute;
              right: 0;
              top: 0;
              text-align: right;
              font-size: 10px;
            }
            .form-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
            }
            .part-title {
              text-align: left;
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
              padding: 5px;
              background-color: #f0f0f0;
            }
            .form-section {
              margin-bottom: 15px;
              border: 1px solid #000;
            }
            .form-row {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .form-row:last-child {
              border-bottom: none;
            }
            .form-cell {
              padding: 5px;
              border-right: 1px solid #000;
            }
            .form-cell:last-child {
              border-right: none;
            }
            .field-number {
              font-weight: bold;
              margin-right: 5px;
            }
            .field-label {
              display: block;
              font-size: 11px;
            }
            .field-value {
              margin-top: 5px;
              font-weight: normal;
            }
            .checkbox-container {
              display: flex;
              align-items: center;
              margin-top: 5px;
            }
            .checkbox {
              width: 12px;
              height: 12px;
              border: 1px solid #000;
              display: inline-block;
              margin-right: 5px;
              position: relative;
            }
            .checkbox.checked::after {
              content: "✓";
              position: absolute;
              left: 1px;
              top: -1px;
              font-size: 10px;
            }
            .checkbox-label {
              margin-right: 15px;
            }
            .footnote {
              font-size: 10px;
              font-style: italic;
            }
            .signature-container {
              margin-top: 20px;
              padding: 10px;
              border: 1px solid #000;
            }
            .signature-row {
              display: flex;
              margin-bottom: 10px;
            }
            .signature-field {
              flex: 1;
              border-bottom: 1px solid #000;
              margin-right: 10px;
              padding-bottom: 5px;
            }
            .signature-label {
              font-size: 11px;
              margin-top: 5px;
            }
            .signature-image {
              width: 200px;
              height: 60px;
              border-bottom: 1px solid #000;
            }
            .page-number {
              text-align: right;
              font-size: 10px;
              margin-top: 20px;
            }
            .full-width {
              width: 100%;
            }
            .half-width {
              width: 50%;
            }
            .third-width {
              width: 33.33%;
            }
            .two-thirds-width {
              width: 66.66%;
            }
            .quarter-width {
              width: 25%;
            }
            .column-1 {
              width: 40%;
            }
            .column-2 {
              width: 30%;
            }
            .column-3 {
              width: 30%;
            }
            .note {
              font-style: italic;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <img src="https://www.state.gov/wp-content/uploads/2018/11/DOS-Great-Seal-500x500.jpg" width="50" height="50" alt="U.S. Department of State Seal" />
            </div>
            <div style="padding-top: 10px;">
              <div class="form-title">U.S. Department of State</div>
              <div class="form-title">REPATRIATION / EMERGENCY MEDICAL AND DIETARY ASSISTANCE LOAN APPLICATION</div>
            </div>
            <div class="header-right">
              <div>OMB Approval Number: 1405-0150</div>
              <div>Expiration Date: 06-30-2027</div>
              <div>Estimated Burden: 20 Minutes</div>
            </div>
          </div>

          <div class="part-title">PART 1 - APPLICATION TO BE COMPLETED BY EACH ADULT APPLICANT REGARDLESS OF NATIONALITY</div>

          <!-- First Row - Name Information -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell column-1">
                <span class="field-number">1.</span>
                <span class="field-label">Last Name (Print Clearly)</span>
                <div class="field-value">${scanData.surname || ''}</div>
              </div>
              <div class="form-cell column-2">
                <span class="field-number">2.</span>
                <span class="field-label">First Name</span>
                <div class="field-value">${scanData.firstName || ''}</div>
              </div>
              <div class="form-cell column-3">
                <span class="field-number">3.</span>
                <span class="field-label">Middle Name</span>
                <div class="field-value">${scanData.middleName || ''}</div>
              </div>
            </div>

            <!-- Second Row - Personal Information -->
            <div class="form-row">
              <div class="form-cell quarter-width">
                <span class="field-number">4.</span>
                <span class="field-label">Social Security Number</span>
                <div class="field-value">${scanData.ssn || ''}</div>
              </div>
              <div class="form-cell quarter-width">
                <span class="field-number">5.</span>
                <span class="field-label">Date of Birth (mm-dd-yyyy)</span>
                <div class="field-value">${formattedBirthDate}</div>
              </div>
              <div class="form-cell quarter-width">
                <span class="field-number">6.</span>
                <span class="field-label">Place of Birth</span>
                <div class="field-value">${formattedPlaceOfBirth}</div>
              </div>
              <div class="form-cell quarter-width">
                <span class="field-number">7.</span>
                <span class="field-label">Identity Document Issuing</span>
                <div class="checkbox-container">
                  <div class="checkbox ${isPassport ? 'checked' : ''}"></div>
                  <span class="checkbox-label">Passport No.</span>
                </div>
                <div class="field-value">${scanData.documentNumber || ''}</div>
                <div class="checkbox-container">
                  <div class="checkbox ${!isPassport ? 'checked' : ''}"></div>
                  <span class="checkbox-label">National ID No.</span>
                </div>
              </div>
              <div class="form-cell" style="width: 100px;">
                <span class="field-number">8.</span>
                <span class="field-label">Sex</span>
                <div class="checkbox-container">
                  <div class="checkbox ${maleChecked}"></div>
                  <span class="checkbox-label">Male</span>
                </div>
                <div class="checkbox-container">
                  <div class="checkbox ${femaleChecked}"></div>
                  <span class="checkbox-label">Female</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Current Lodging Section -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">9.</span>
                <span class="field-label">Current lodging where you may be contacted now.</span>
                <div class="field-value">${scanData.currentLodging || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-number">10.</span>
                <span class="field-label">Phone number where you may be contacted now.</span>
                <div class="field-value">${scanData.phoneNumber || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-number">11.</span>
                <span class="field-label">E-mail address where you may be contacted now.</span>
                <div class="field-value">${scanData.email || ''}</div>
              </div>
            </div>
          </div>

          <!-- Medical Condition Section -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">12.</span>
                <span class="field-label">Medical condition, current injuries, or limited mobility relevant to evacuation.</span>
                <div class="field-value">${scanData.medicalConditions || ''}</div>
              </div>
            </div>
          </div>

          <!-- Billing Address Section -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">13.</span>
                <span class="field-label">Verifiable Billing Address at Final Destination in United States or other Permanent Address (Not a Post Office Box)</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">14.</span>
                <span class="field-label">Address Line 1</span>
                <div class="field-value">${scanData.billingAddress1 || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">15.</span>
                <span class="field-label">Address Line 2</span>
                <div class="field-value">${scanData.billingAddress2 || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-number">16.</span>
                <span class="field-label">City</span>
                <div class="field-value">${scanData.billingCity || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-number">17.</span>
                <span class="field-label">State/Province</span>
                <div class="field-value">${scanData.billingState || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">18.</span>
                <span class="field-label">Country</span>
                <div class="field-value">${scanData.billingCountry || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-number">19.</span>
                <span class="field-label">Postal Code</span>
                <div class="field-value">${scanData.billingPostalCode || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-number">20.</span>
                <span class="field-label">Telephone Number (Include Country/City Codes)</span>
                <div class="field-value">${scanData.billingPhone || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">21.</span>
                <span class="field-label">E-mail Address</span>
                <div class="field-value">${scanData.billingEmail || ''}</div>
              </div>
            </div>
          </div>

          <!-- Emergency Contact Section -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">22.</span>
                <span class="field-label">Emergency Contact (Do not list someone traveling with you)</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-number">23.</span>
                <span class="field-label">Last Name (Print Clearly)</span>
                <div class="field-value">${scanData.emergencyLastName || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-number">24.</span>
                <span class="field-label">First Name</span>
                <div class="field-value">${scanData.emergencyFirstName || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">25.</span>
                <span class="field-label">Address Line 1</span>
                <div class="field-value">${scanData.emergencyAddress1 || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">26.</span>
                <span class="field-label">Address Line 2</span>
                <div class="field-value">${scanData.emergencyAddress2 || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-number">27.</span>
                <span class="field-label">City</span>
                <div class="field-value">${scanData.emergencyCity || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-number">28.</span>
                <span class="field-label">State/Province</span>
                <div class="field-value">${scanData.emergencyState || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">29.</span>
                <span class="field-label">Country</span>
                <div class="field-value">${scanData.emergencyCountry || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-number">30.</span>
                <span class="field-label">Postal Code</span>
                <div class="field-value">${scanData.emergencyPostalCode || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-number">31.</span>
                <span class="field-label">Telephone Number (Include Country/City Codes)</span>
                <div class="field-value">${scanData.emergencyPhone || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">32.</span>
                <span class="field-label">E-mail Address</span>
                <div class="field-value">${scanData.emergencyEmail || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">33.</span>
                <span class="field-label">Relationship to you</span>
                <div class="field-value">${scanData.emergencyRelationship || ''}</div>
              </div>
            </div>
          </div>

          <!-- Accompanying Persons Section -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">34.</span>
                <span class="field-label">If including minor children or incapacitated/incompetent adults, please list below.</span>
                <div class="checkbox-container">
                  <div class="checkbox"></div>
                  <span class="checkbox-label">Check here if none.</span>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell full-width">
                <div class="field-value">${scanData.accompanyingPersons || ''}</div>
              </div>
            </div>
          </div>

          <!-- Additional Travel Information Section (Not in original form but useful) -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-cell full-width">
                <span class="field-number">Additional Travel Information</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-label">Carrier</span>
                <div class="field-value">${scanData.carrier || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-label">Routing</span>
                <div class="field-value">${scanData.routing || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-label">Flight Number</span>
                <div class="field-value">${scanData.flightNumber || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-label">Date of Flight</span>
                <div class="field-value">${scanData.dateOfFlight || ''}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-cell half-width">
                <span class="field-label">Seats</span>
                <div class="field-value">${scanData.seats || ''}</div>
              </div>
              <div class="form-cell half-width">
                <span class="field-label">Meal Preference</span>
                <div class="field-value">${scanData.meal || ''}</div>
              </div>
            </div>
          </div>

          <!-- Signature Section -->
          ${scanData.signature ? `
          <div class="signature-container">
            <div class="form-row" style="border: none;">
              <div class="form-cell full-width" style="border: none;">
                <span class="field-number">90.</span>
                <span class="field-label">Signature Block for Applicant</span>
              </div>
            </div>
            <div style="margin-top: 10px; margin-bottom: 20px;">
              <p>I hereby accept the foregoing terms and conditions of repayment for myself and persons listed.</p>
            </div>
            <div class="signature-row">
              <div class="signature-field" style="flex: 3;">
                <span class="field-number">91.</span>
                <span class="field-label">Full Name Printed</span>
                <div class="field-value">${scanData.surname || ''}, ${scanData.firstName || ''} ${scanData.middleName || ''}</div>
              </div>
            </div>
            <div class="signature-row">
              <div style="flex: 2;">
                <span class="field-number">92.</span>
                <span class="field-label">Signature (Inked, Typed*)</span>
                <div>
                  <img src="${scanData.signature}" style="max-width: 200px; max-height: 60px;" />
                </div>
              </div>
              <div style="flex: 1;">
                <span class="field-number">93.</span>
                <span class="field-label">Date (mm-dd-yyyy)</span>
                <div class="field-value">${new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'})}</div>
              </div>
            </div>
            <div style="margin-top: 10px; font-style: italic; font-size: 10px;">
              * Retyping your name in this box using a digital device is as acceptable as signing with pen and paper.
            </div>
          </div>
          ` : ''}

          <div class="page-number">DS-3072<br/>04-2024<br/>Page 1 of 3</div>
        </body>
      </html>
    `;

    // Generate the PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (isSharingAvailable) {
      // Share the PDF file
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Repatriation Form',
        UTI: 'com.adobe.pdf' // iOS only
      });
    }

    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default generateFormPDF;