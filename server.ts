import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("trading_journal.db");

// Initialize database with migration support
db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    asset TEXT NOT NULL,
    type TEXT NOT NULL,
    entry_reason TEXT,
    exit_reason TEXT,
    emotion TEXT,
    discipline_score INTEGER,
    p_l REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add new columns if they don't exist
const columns = db.prepare("PRAGMA table_info(trades)").all() as any[];
const columnNames = columns.map(c => c.name);

const newColumns = [
  { name: 'purchase_price', type: 'REAL DEFAULT 0' },
  { name: 'selling_price', type: 'REAL DEFAULT 0' },
  { name: 'purchase_qty', type: 'INTEGER DEFAULT 0' },
  { name: 'sold_qty', type: 'INTEGER DEFAULT 0' },
  { name: 'balance_qty', type: 'INTEGER DEFAULT 0' }
];

newColumns.forEach(col => {
  if (!columnNames.includes(col.name)) {
    db.exec(`ALTER TABLE trades ADD COLUMN ${col.name} ${col.type}`);
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/trades", (req, res) => {
    try {
      const trades = db.prepare("SELECT * FROM trades ORDER BY date DESC").all();
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.post("/api/trades", (req, res) => {
    const { 
      date, asset, type, purchase_price, selling_price, 
      purchase_qty, sold_qty, balance_qty, 
      entry_reason, exit_reason, emotion, discipline_score, p_l, notes 
    } = req.body;
    try {
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
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save trade" });
    }
  });

  app.delete("/api/trades/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM trades WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trade" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
