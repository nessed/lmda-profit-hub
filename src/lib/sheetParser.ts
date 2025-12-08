// Fetch and parse Google Sheet rows from the Apps Script proxy
// Uses the Vite dev proxy (/api/gsheet) on localhost and falls back to the direct Apps Script URL otherwise.

export interface ParsedRegistration {
  rowIndex: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  paymentConfirmed: string | null;
  amountRs: number;
} //comett

const LOCAL_PROXY_URL = "/api/gsheet";
const DIRECT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwAFjlTPXFzp0mxy5prw3XuQvn1sUa9SGEXLLbuV2i-fG9-4qgggKCE-32WRp5o1YvIEA/exec";

const isLocalhost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(
    window.location.hostname
  );

const GOOGLE_SCRIPT_URL =
  import.meta.env.DEV || isLocalhost ? LOCAL_PROXY_URL : DIRECT_SCRIPT_URL;

const normalizeText = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const normalizeHeader = (h: any) =>
  String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizePaymentStatus = (raw: any): { label: string | null; paid: boolean } => {
  const text = normalizeText(raw);
  if (!text) return { label: null, paid: false };

  const lower = text.toLowerCase();
  const plain = lower.replace(/[^a-z0-9 ]+/g, " ");

  const negative = /(unpaid|not\s*paid|pending|due|outstanding|no\b|false\b|0\b|not receiving|no answer|postponed)/;
  if (negative.test(plain)) return { label: "unpaid", paid: false };

  const positive = /(paid|yes\b|y\b|true\b|done|complete|completed|success|confirm|received|recieved|cleared|settled|1\b)/;
  if (positive.test(plain)) return { label: "paid", paid: true };

  return { label: text, paid: false };
};

const parseRows = (raw: string) => {
  // Expect JSON array-of-arrays
  return JSON.parse(raw);
};

export async function fetchAndParseSheet(sheetUrl: string): Promise<ParsedRegistration[]> {
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?url=${encodeURIComponent(sheetUrl)}`);
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to connect (${response.status}) ${raw.slice(0, 120)}`);
  }

  let rows: any;
  try {
    rows = parseRows(raw);
  } catch (error) {
    const textOnly = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(`Unexpected response from helper script: ${textOnly.slice(0, 200)}`);
  }

  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("Sheet appears to be empty or has no data rows");
  }

  // Header mapping
  const headers = rows[0].map(normalizeHeader);

  const findCol = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const target = normalizeHeader(name);
      const idx = headers.indexOf(target);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Using your sheet layout, with colon suffixes and spelling variants
  const nameCol = findCol(["name", "name:", "your name", "participant name", "full name"]);
  const phoneCol = findCol(["phone number", "phone", "mobile", "contact", "whatsapp"]);
  const emailCol = findCol(["email", "email:", "email address", "email id"]);
  const notesCol = findCol(["notes"]);
  const paymentCol = findCol([
    "payment recieved?",
    "payment received?",
    "payment recieved",
    "payment received",
    "payment status",
    "paid",
  ]);
  let amountCol = findCol([
    "payment recieved in numbers",
    "payment received in numbers",
    "amount in rs",
    "amount",
    "payment amount",
    "paid amount",
    "amount paid",
    "total",
    "total amount",
  ]);

  // Fallback to known column positions for this sheet (0-based indices)
  const resolvedNameCol = nameCol === -1 ? 2 : nameCol; // "Name:"
  const resolvedEmailCol = emailCol === -1 ? 3 : emailCol; // "Email:"
  const resolvedPhoneCol = phoneCol === -1 ? 4 : phoneCol; // "Phone number:"
  const resolvedNotesCol = notesCol === -1 ? 9 : notesCol; // "Notes"
  const resolvedPaymentCol = paymentCol === -1 ? 10 : paymentCol; // "Payment Recieved?"
  if (amountCol === -1 && headers.length > 0) {
    amountCol = headers.length - 1; // last column is "Payment Recieved in Numbers"
  }

  const registrations: ParsedRegistration[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((cell: any) => !normalizeText(cell))) continue;

    const getCell = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] : null);
    const rawAmount = getCell(amountCol);
    const amountStr = normalizeText(rawAmount);
    const numericAmount = amountStr ? parseFloat(amountStr.replace(/[^\d.-]/g, "")) : 0;
    const { label: paymentStatus } = normalizePaymentStatus(getCell(resolvedPaymentCol));

    registrations.push({
      rowIndex: i + 1, // sheet row (1-based)
      fullName: normalizeText(getCell(resolvedNameCol)),
      phone: normalizeText(getCell(resolvedPhoneCol)),
      email: normalizeText(getCell(resolvedEmailCol)),
      notes: normalizeText(getCell(resolvedNotesCol)),
      paymentConfirmed: paymentStatus,
      amountRs: Number.isFinite(numericAmount) ? numericAmount : 0,
    });
  }

  if (import.meta.env.DEV && typeof console !== "undefined") {
    console.groupCollapsed("Sheet sync: parsed data");
    console.log("Headers (normalized)", headers);
    console.log("Resolved columns", {
      nameCol: resolvedNameCol,
      phoneCol: resolvedPhoneCol,
      emailCol: resolvedEmailCol,
      notesCol: resolvedNotesCol,
      paymentCol: resolvedPaymentCol,
      amountCol,
    });
    console.log("Raw rows", rows);
    console.log("Registrations", registrations);
    console.groupEnd();
  }

  return registrations;
}
