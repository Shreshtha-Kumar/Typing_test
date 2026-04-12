const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/typing.db', (err) => {
  if (err) console.error("DB Error:", err.message);
  else console.log("Connected to SQLite");
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      best_wpm INTEGER DEFAULT 0,
      avg_wpm REAL DEFAULT 0,
      tests_taken INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      wpm INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;