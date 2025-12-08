import { Registration } from './api';

// Use the local proxy path (which forwards to Google)
const GOOGLE_SCRIPT_URL = "/api/gsheet";

export interface ParsedRegistration {
  rowIndex: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  paymentConfirmed: string | null;
  amountRs: number;
}

export async function fetchAndParseSheet(sheetUrl: string): Promise<ParsedRegistration[]> {
  // 1. Call the local proxy
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?url=${encodeURIComponent(sheetUrl)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to connect to helper script: ${response.statusText}`);
  }

  // 2. Parse the JSON response
  let json;
  try {
    json = await response.json();
  } catch (e) {
    throw new Error("Invalid JSON received. The script might be returning an HTML error page.");
  }

  if (json.error) {
    throw new Error(`Script error: ${json.error}`);
  }

  const rows = json; 

  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('Sheet appears to be empty or has no data rows');
  }
  
  // 3. Map the columns
  const headers = rows[0].map((h: string) => String(h).toLowerCase().trim());
  
  const findCol = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const idx = headers.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameCol = findCol(['full name', 'name', 'your name', 'participant name']);
  const phoneCol = findCol(['phone', 'phone number', 'mobile', 'contact', 'whatsapp']);
  const emailCol = findCol(['email', 'email address', 'email id']);
  const notesCol = findCol(['notes']);
  const paymentCol = findCol(['payment confirmed?', 'payment confirmed', 'payment status', 'paid']);
  const amountCol = findCol(['amount in rs', 'amount', 'amount (rs)', 'payment amount']);
  
  const registrations: ParsedRegistration[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const getCell = (idx: number) => (idx >= 0 && idx < row.length ? String(row[idx]) : null);
    const amountStr = getCell(amountCol)?.replace(/[^\d.-]/g, '') || '0';
    
    registrations.push({
      rowIndex: i + 1,
      fullName: getCell(nameCol),
      phone: getCell(phoneCol),
      email: getCell(emailCol),
      notes: getCell(notesCol),
      paymentConfirmed: getCell(paymentCol),
      amountRs: parseFloat(amountStr) || 0,
    });
  }
  
  return registrations;
}