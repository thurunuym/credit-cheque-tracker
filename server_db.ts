import { MongoClient, ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { Cheque, CreditInvoice, CreditPayment } from './src/types';

// Path for local disk storage fallback if MONGODB_URI is not provided
const FALLBACK_DIR = path.join(process.cwd(), 'data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'db_fallback.json');

// Interface for local JSON database structure
interface FallbackSchema {
  cheques: Cheque[];
  creditInvoices: CreditInvoice[];
  creditPayments: CreditPayment[];
}

// Ensure local backup directory and file exist with initial state
function getLocalDB(): FallbackSchema {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_FILE)) {
    const initialState: FallbackSchema = {
      cheques: [],
      creditInvoices: [],
      creditPayments: []
    };
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }
  try {
    const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading fallback DB, resetting:', err);
    const initialState: FallbackSchema = {
      cheques: [],
      creditInvoices: [],
      creditPayments: []
    };
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }
}

function saveLocalDB(data: FallbackSchema) {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  }
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// MongoDB Setup
const MONGODB_URI = process.env.MONGODB_URI;
let mongoClient: MongoClient | null = null;
let isUsingMongo = false;

if (MONGODB_URI) {
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    isUsingMongo = true;
    console.log('✅ Found MONGODB_URI. Operating in MongoDB Atlas mode.');
  } catch (err) {
    console.error('❌ Failed to construct MongoClient, falling back to local file DB:', err);
  }
} else {
  console.log('⚠️ No MONGODB_URI env var found. Operating in Local Disk Fallback mode (/data/db_fallback.json).');
}

async function getDb() {
  if (isUsingMongo && mongoClient) {
    try {
      // Connect if not already connected
      await mongoClient.connect();
      return mongoClient.db(); // uses default db in connection string
    } catch (err) {
      console.error('❌ MongoDB Connection error, falling back to local file DB operations:', err);
      return null;
    }
  }
  return null;
}

export const dbManager = {
  isMongoActive(): boolean {
    return isUsingMongo;
  },

  // --- CHEQUES CRUD ---
  async getCheques(): Promise<Cheque[]> {
    const db = await getDb();
    if (db) {
      try {
        const items = await db.collection('cheques').find().sort({ createdAt: -1 }).toArray();
        return items.map(item => ({
          ...item,
          id: item._id.toString(),
        })) as unknown as Cheque[];
      } catch (err) {
        console.error('Error fetching cheques from Mongo:', err);
      }
    }
    // Fallback
    const local = getLocalDB();
    return [...local.cheques].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addCheque(cheque: Omit<Cheque, 'id'>): Promise<Cheque> {
    const db = await getDb();
    const idStr = new ObjectId().toString();
    const newCheque = {
      ...cheque,
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const result = await db.collection('cheques').insertOne(newCheque);
        return {
          ...newCheque,
          id: result.insertedId.toString()
        } as Cheque;
      } catch (err) {
        console.error('Error inserting cheque to Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const chequeWithId: Cheque = {
      ...newCheque,
      id: idStr
    };
    local.cheques.push(chequeWithId);
    saveLocalDB(local);
    return chequeWithId;
  },

  async updateCheque(id: string, updates: Partial<Cheque>): Promise<Cheque | null> {
    const db = await getDb();
    // Exclude id and _id from updates
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;

    if (db) {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(id) };
        } catch {
          filter = { _id: id as any };
        }
        await db.collection('cheques').updateOne(filter, { $set: cleanUpdates });
        const updated = await db.collection('cheques').findOne(filter);
        if (updated) {
          return {
            ...updated,
            id: updated._id.toString()
          } as unknown as Cheque;
        }
      } catch (err) {
        console.error('Error updating cheque in Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const index = local.cheques.findIndex(c => c.id === id);
    if (index !== -1) {
      local.cheques[index] = {
        ...local.cheques[index],
        ...cleanUpdates
      };
      saveLocalDB(local);
      return local.cheques[index];
    }
    return null;
  },

  async deleteCheque(id: string): Promise<boolean> {
    const db = await getDb();
    if (db) {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(id) };
        } catch {
          filter = { _id: id as any };
        }
        const result = await db.collection('cheques').deleteOne(filter);
        return result.deletedCount > 0;
      } catch (err) {
        console.error('Error deleting cheque in Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const lengthBefore = local.cheques.length;
    local.cheques = local.cheques.filter(c => c.id !== id);
    saveLocalDB(local);
    return local.cheques.length < lengthBefore;
  },

  // --- CREDIT INVOICES CRUD ---
  async getCreditInvoices(): Promise<CreditInvoice[]> {
    const db = await getDb();
    if (db) {
      try {
        const invoices = await db.collection('credit_invoices').find().sort({ createdAt: -1 }).toArray();
        const payments = await db.collection('credit_payments').find().toArray();

        return invoices.map(inv => {
          const invId = inv._id.toString();
          const invPayments = payments
            .filter(p => p.invoiceId === invId)
            .map(p => ({ ...p, id: p._id.toString() } as any));

          const totalPaid = invPayments.reduce((sum, p) => sum + p.amount, 0);
          const balance = inv.totalAmount - totalPaid;

          return {
            ...inv,
            id: invId,
            payments: invPayments,
            balance: balance
          } as unknown as CreditInvoice;
        });
      } catch (err) {
        console.error('Error fetching invoices from Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    return local.creditInvoices.map(inv => {
      const invPayments = local.creditPayments.filter(p => p.invoiceId === inv.id);
      const totalPaid = invPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = inv.totalAmount - totalPaid;

      return {
        ...inv,
        payments: invPayments,
        balance: balance
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addCreditInvoice(invoice: Omit<CreditInvoice, 'id'>): Promise<CreditInvoice> {
    const db = await getDb();
    const idStr = new ObjectId().toString();
    const newInvoice = {
      ...invoice,
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const result = await db.collection('credit_invoices').insertOne(newInvoice);
        return {
          ...newInvoice,
          id: result.insertedId.toString(),
          payments: [],
          balance: newInvoice.totalAmount
        } as CreditInvoice;
      } catch (err) {
        console.error('Error inserting credit invoice to Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const invoiceWithId: CreditInvoice = {
      ...newInvoice,
      id: idStr,
      payments: [],
      balance: newInvoice.totalAmount
    };
    local.creditInvoices.push(invoiceWithId);
    saveLocalDB(local);
    return invoiceWithId;
  },

  async deleteCreditInvoice(id: string): Promise<boolean> {
    const db = await getDb();
    if (db) {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(id) };
        } catch {
          filter = { _id: id as any };
        }
        // Delete the invoice
        const result = await db.collection('credit_invoices').deleteOne(filter);
        // Cascading delete payments for this invoice
        await db.collection('credit_payments').deleteMany({ invoiceId: id });
        return result.deletedCount > 0;
      } catch (err) {
        console.error('Error deleting credit invoice in Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const lengthBefore = local.creditInvoices.length;
    local.creditInvoices = local.creditInvoices.filter(i => i.id !== id);
    local.creditPayments = local.creditPayments.filter(p => p.invoiceId !== id);
    saveLocalDB(local);
    return local.creditInvoices.length < lengthBefore;
  },

  // --- CREDIT PAYMENTS CRUD ---
  async addCreditPayment(payment: Omit<CreditPayment, 'id'>): Promise<CreditPayment> {
    const db = await getDb();
    const idStr = new ObjectId().toString();
    const newPayment = {
      ...payment,
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const result = await db.collection('credit_payments').insertOne(newPayment);
        return {
          ...newPayment,
          id: result.insertedId.toString()
        } as CreditPayment;
      } catch (err) {
        console.error('Error inserting credit payment to Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const paymentWithId: CreditPayment = {
      ...newPayment,
      id: idStr
    };
    local.creditPayments.push(paymentWithId);
    saveLocalDB(local);
    return paymentWithId;
  },

  async deleteCreditPayment(id: string): Promise<boolean> {
    const db = await getDb();
    if (db) {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(id) };
        } catch {
          filter = { _id: id as any };
        }
        const result = await db.collection('credit_payments').deleteOne(filter);
        return result.deletedCount > 0;
      } catch (err) {
        console.error('Error deleting credit payment in Mongo:', err);
      }
    }

    // Fallback
    const local = getLocalDB();
    const lengthBefore = local.creditPayments.length;
    local.creditPayments = local.creditPayments.filter(p => p.id !== id);
    saveLocalDB(local);
    return local.creditPayments.length < lengthBefore;
  }
};
