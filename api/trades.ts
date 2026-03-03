import { VercelRequest, VercelResponse } from '@vercel/node';
import Database from 'better-sqlite3';
import path from 'path';

// Note: better-sqlite3 with a local file will NOT persist data on Vercel production.
// This is for demonstration of the refactor. Use a hosted DB for production.
const dbPath = path.join(process.cwd(), 'trading_journal.db');
const db = new Database(dbPath);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const trades = db.prepare("SELECT * FROM trades ORDER BY date DESC").all();
      return res.status(200).json(trades);
    }

    if (method === 'POST') {
      const { 
        date, asset, type, purchase_price, selling_price, 
        purchase_qty, sold_qty, balance_qty, 
        entry_reason, exit_reason, emotion, discipline_score, p_l, notes 
      } = req.body;

      const info = db.prepare(`
        INSERT INTO trades (
          date, asset, type, purchase_price, selling_price, 
          purchase_qty, sold_qty, balance_qty, 
          entry_reason, exit_reason, emotion, discipline_score, p_l, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        date, asset, type, purchase_price, selling_price, 
        purchase_qty, sold_qty, balance_qty, 
        entry_reason, exit_reason, emotion, discipline_score, p_l, notes
      );
      return res.status(201).json({ id: info.lastInsertRowid });
    }

    if (method === 'DELETE') {
      const { id } = req.query;
      db.prepare("DELETE FROM trades WHERE id = ?").run(id);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
