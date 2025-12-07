export interface ParsedRegistration {
  rowIndex: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  paymentConfirmed: string | null;
  amountRs: number;
}

function convertToCSVUrl(sheetUrl: string): string {
  // Handle different Google Sheets URL formats
  // Format 1: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
  // Format 2: https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
  // Target: https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv
  
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const sheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }
  
  throw new Error('Invalid Google Sheets URL format');
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      if (char === '\r') i++;
    } else if (char !== '\r') {
      currentCell += char;
    }
  }
  
  // Push last cell and row if exists
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  
  return rows;
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const name of possibleNames) {
    const index = normalizedHeaders.indexOf(name.toLowerCase());
    if (index !== -1) return index;
  }
  
  return -1;
}

export async function fetchAndParseSheet(sheetUrl: string): Promise<ParsedRegistration[]> {
  const csvUrl = convertToCSVUrl(sheetUrl);
  
  // Use a CORS proxy for the fetch
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
  
  const response = await fetch(proxyUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  
  if (rows.length < 2) {
    throw new Error('Sheet appears to be empty or has no data rows');
  }
  
  const headers = rows[0];
  
  // Find column indices
  const nameCol = findColumnIndex(headers, ['full name', 'name', 'your name', 'participant name']);
  const phoneCol = findColumnIndex(headers, ['phone', 'phone number', 'mobile', 'contact', 'whatsapp']);
  const emailCol = findColumnIndex(headers, ['email', 'email address', 'email id']);
  const notesCol = findColumnIndex(headers, ['notes']);
  const paymentCol = findColumnIndex(headers, ['payment confirmed?', 'payment confirmed', 'payment status', 'paid']);
  const amountCol = findColumnIndex(headers, ['amount in rs', 'amount', 'amount (rs)', 'payment amount']);
  
  const registrations: ParsedRegistration[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (row.every(cell => !cell)) continue;
    
    const amountStr = amountCol >= 0 && row[amountCol] ? row[amountCol].replace(/[^\d.-]/g, '') : '0';
    const amount = parseFloat(amountStr) || 0;
    
    registrations.push({
      rowIndex: i,
      fullName: nameCol >= 0 ? row[nameCol] || null : null,
      phone: phoneCol >= 0 ? row[phoneCol] || null : null,
      email: emailCol >= 0 ? row[emailCol] || null : null,
      notes: notesCol >= 0 ? row[notesCol] || null : null,
      paymentConfirmed: paymentCol >= 0 ? row[paymentCol] || null : null,
      amountRs: amount,
    });
  }
  
  return registrations;
}
