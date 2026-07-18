import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { dbManager } from './server_db';

const app = express();
app.use(express.json());

// API Routes
app.get('/api/db-status', (req, res) => {
  res.json({ isMongo: dbManager.isMongoActive() });
});

app.get('/api/cheques', async (req, res) => {
  try {
    const data = await dbManager.getCheques();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cheques', async (req, res) => {
  try {
    const newCheque = await dbManager.addCheque(req.body);
    res.status(201).json(newCheque);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cheques/:id', async (req, res) => {
  try {
    const updated = await dbManager.updateCheque(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Cheque not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cheques/:id', async (req, res) => {
  try {
    const success = await dbManager.deleteCheque(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/credits', async (req, res) => {
  try {
    const data = await dbManager.getCreditInvoices();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credits', async (req, res) => {
  try {
    const newInvoice = await dbManager.addCreditInvoice(req.body);
    res.status(201).json(newInvoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/credits/:id', async (req, res) => {
  try {
    const success = await dbManager.deleteCreditInvoice(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credits/:invoiceId/payments', async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      invoiceId: req.params.invoiceId,
      amount: Number(req.body.amount),
    };
    const newPayment = await dbManager.addCreditPayment(paymentData);
    res.status(201).json(newPayment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', async (req, res) => {
  try {
    const success = await dbManager.deleteCreditPayment(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/shops', async (req, res) => {
  try {
    const cheques = await dbManager.getCheques();
    const invoices = await dbManager.getCreditInvoices();
    const shops = new Set<string>();
    cheques.forEach(c => c.shop && shops.add(c.shop.trim()));
    invoices.forEach(i => i.shop && shops.add(i.shop.trim()));
    res.json(Array.from(shops).filter(Boolean).sort());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
