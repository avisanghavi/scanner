/**
 * Parses the raw MRZ text from a scanned document.
 * @param {string} mrzText - The raw text string from the MRZ scan.
 * @returns {object|null} Parsed MRZ data or null if parsing fails.
 */
export const parseMRZ = (mrzText) => {
  try {
    console.log('Parsing MRZ text:', mrzText);
    
    const lines = mrzText.split('\n').map(line => line.trim());
    console.log('Cleaned lines:', lines);

    if (lines.length < 2) {
      console.error('Not enough lines in MRZ data');
      return null;
    }

    // First line parsing (TD1 format)
    const line1 = lines[0];
    const documentType = line1.substring(0, 2).trim();
    const issuingCountry = line1.substring(2, 5).trim();
    
    const nameParts = line1.substring(5).split('<<').filter(Boolean);
    const surname = nameParts[0]?.replace(/</g, ' ').trim() || '';
    const givenNames = nameParts[1]?.replace(/</g, ' ').trim() || '';
    const [firstName, ...middleNames] = givenNames.split(' ');
    const middleName = middleNames.join(' ');

    // Second line parsing
    const line2 = lines[1];
    const documentNumber = line2.substring(0, 9).trim();
    const nationality = line2.substring(10, 13).trim();
    const dateOfBirth = line2.substring(13, 19).trim();
    const sex = line2.substring(20, 21).trim().toUpperCase() === '1' ? 'F' : 
                line2.substring(20, 21).trim().toUpperCase() === '2' ? 'M' : 
                line2.substring(20, 21).trim().toUpperCase();
    const expiryDate = line2.substring(21, 27).trim();

    const parsedData = {
      documentType,
      issuingCountry,
      surname,
      firstName,
      middleName,
      documentNumber,
      nationality,
      dateOfBirth,
      sex,
      expiryDate
    };

    console.log('Parsed MRZ data:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('Error parsing MRZ:', error);
    return null;
  }
};

/**
 * Formats a 6-digit date string (YYMMDD) into DD/MM/YYYY format.
 * @param {string} dateStr - The 6-digit date string.
 * @param {boolean} [isExpiryDate=false] - Flag to help determine century (assumes expiry is 20xx).
 * @returns {string} Formatted date string or 'Invalid date'.
 */
export const formatMRZDate = (dateStr, isExpiryDate = false) => {
  if (!dateStr || dateStr.length !== 6) return 'Invalid date';
  
  const year = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);
  
  let fullYear;
  // Basic heuristic for determining century
  if (isExpiryDate) {
    // Expiry dates are likely in the 2000s
    fullYear = `20${year}`;
  } else {
    // Birth dates: If year > current year's last two digits + 10 (arbitrary threshold), assume 19xx
    const currentYearLastTwo = new Date().getFullYear() % 100;
    fullYear = parseInt(year) > (currentYearLastTwo + 10) ? `19${year}` : `20${year}`; 
  }
  
  // Basic validation
  const date = new Date(`${fullYear}-${month}-${day}`);
  if (isNaN(date.getTime()) || date.getDate() !== parseInt(day) || (date.getMonth() + 1) !== parseInt(month)) {
     return 'Invalid date';
  }
  
  return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${fullYear}`;
}; 