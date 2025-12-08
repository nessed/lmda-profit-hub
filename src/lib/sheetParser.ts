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

const normalizeText = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const normalizePaymentStatus = (raw: any): { label: string | null; paid: boolean } => {
  const text = normalizeText(raw);
  if (!text) return { label: null, paid: false };

  const lower = text.toLowerCase();
  const plain = lower.replace(/[^a-z0-9 ]+/g, ' ');

  const negative = /(unpaid|not\s*paid|pending|due|outstanding|no\b|false\b|0\b)/;
  if (negative.test(plain)) return { label: 'unpaid', paid: false };

  const positive = /(paid|yes\b|y\b|true\b|done|complete|completed|success|confirm|received|cleared|settled|1\b)/;
  if (positive.test(plain)) return { label: 'paid', paid: true };

  return { label: text, paid: false };
};

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
  const normalizeHeader = (h: any) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const headers = rows[0].map(normalizeHeader);
  
  const findCol = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const target = normalizeHeader(name);
      const idx = headers.indexOf(target);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameCol = findCol(['full name', 'name', 'your name', 'participant name']);
  const phoneCol = findCol(['phone', 'phone number', 'mobile', 'contact', 'whatsapp']);
  const emailCol = findCol(['email', 'email address', 'email id']);
  const notesCol = findCol(['notes']);
  const paymentCol = findCol([
    'payment confirmed?',
    'payment confirmed',
    'payment status',
    'paid',
    'payment',
    'payment recieved?',
    'payment received?',
    'payment recieved',
    'payment received'
  ]);
  // Prefer explicit amount column names; otherwise fall back to the last column as a catch-all for totals
  let amountCol = findCol([
    'amount in rs',
    'amount',
    'amount (rs)',
    'payment amount',
    'paid amount',
    'total',
    'total amount',
    'payment recieved in numbers',
    'payment received in numbers',
    'payment received',
    'payment recieved',
    'amount paid',
    'amount in numbers'
  ]);

  // Fallback to known positions for this sheet layout if headers were not found
  const resolvedNameCol = nameCol === -1 ? 2 : nameCol;
  const resolvedPhoneCol = phoneCol === -1 ? 4 : phoneCol;
  const resolvedEmailCol = emailCol === -1 ? 3 : emailCol;
  const resolvedNotesCol = notesCol === -1 ? 9 : notesCol;
  const resolvedPaymentCol = paymentCol === -1 ? 10 : paymentCol;
  if (amountCol === -1 && headers.length > 0) {
    // Known layout: last column is payment number
    amountCol = headers.length - 1;
    if (import.meta.env.DEV && typeof console !== 'undefined') {
      console.warn('Amount column not found by header; using last column as amount fallback.');
    }
  }
  
  const registrations: ParsedRegistration[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const getCell = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] : null);
    const rawAmount = getCell(amountCol);
    const amountStr = normalizeText(rawAmount);
    const numericAmount = amountStr ? parseFloat(amountStr.replace(/[^\d.-]/g, '')) : 0;
    const { label: paymentStatus } = normalizePaymentStatus(getCell(resolvedPaymentCol));
    
    registrations.push({
      rowIndex: i + 1,
      fullName: normalizeText(getCell(resolvedNameCol)),
      phone: normalizeText(getCell(resolvedPhoneCol)),
      email: normalizeText(getCell(resolvedEmailCol)),
      notes: normalizeText(getCell(resolvedNotesCol)),
      paymentConfirmed: paymentStatus,
      amountRs: Number.isFinite(numericAmount) ? numericAmount : 0,
    });
  }

  // Helpful logging in dev to inspect the incoming sheet data
  if (import.meta.env.DEV && typeof console !== 'undefined') {
    console.groupCollapsed('Sheet sync: parsed data');
    console.log('Headers (normalized)', headers);
    console.log('Resolved columns', {
      nameCol: resolvedNameCol,
      phoneCol: resolvedPhoneCol,
      emailCol: resolvedEmailCol,
      notesCol: resolvedNotesCol,
      paymentCol: resolvedPaymentCol,
      amountCol,
    });
    console.log('Raw rows', rows);
    console.log('Registrations', registrations);
    console.groupEnd();
  }
  
  return registrations;
}
