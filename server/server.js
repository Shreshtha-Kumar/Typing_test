const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const db = require('./database');
const { getRandomPassage } = require('./passages');

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: 'typing-secret',
  resave: false,
  saveUninitialized: false
}));

// REGISTER
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ error: "Missing fields" });

  db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
    if (err) return res.json({ error: "DB error" });

    if (row.count >= 5)
      return res.json({ error: "User limit reached (5 max)" });

    const hash = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash],
      (err) => {
        if (err) return res.json({ error: "Username exists" });
        res.json({ success: true });
      }
    );
  });
});

// LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) return res.json({ error: "DB error" });
    if (!user) return res.json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: "Wrong password" });

    req.session.user = user;
    res.json({ success: true });
  });
});

// PASSAGE
app.get('/passage', (req, res) => {
  try {
    res.json({ passage: getRandomPassage() });
  } catch {
    res.json({ error: "Failed to load passage" });
  }
});

// RESULT
app.post('/result', (req, res) => {
  const { wpm } = req.body;
  const user = req.session.user;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  db.get("SELECT * FROM users WHERE id = ?", [user.id], (err, u) => {
    if (err || !u) return res.json({ error: "User fetch error" });

    const newBest = Math.max(u.best_wpm, wpm);
    const total = u.avg_wpm * u.tests_taken + wpm;
    const tests = u.tests_taken + 1;
    const newAvg = total / tests;

    db.run(`
      UPDATE users
      SET best_wpm = ?, avg_wpm = ?, tests_taken = ?
      WHERE id = ?
    `, [newBest, newAvg, tests, u.id]);

    db.run(
      "INSERT INTO results (user_id, wpm) VALUES (?, ?)",
      [u.id, wpm]
    );

    res.json({ best: newBest, avg: newAvg.toFixed(2) });
  });
});

// HISTORY
app.get('/history', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  db.all(
    "SELECT wpm, created_at FROM results WHERE user_id = ? ORDER BY id ASC",
    [user.id],
    (err, rows) => {
      if (err) return res.json({ error: "DB error" });
      res.json(rows);
    }
  );
});

// STATS
app.get('/stats', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Unauthorized" });

  db.get(
    "SELECT best_wpm, avg_wpm FROM users WHERE id = ?",
    [req.session.user.id],
    (err, row) => {
      if (err) return res.json({ error: "DB error" });
      res.json(row);
    }
  );
});

app.listen(3000, () => console.log("http://localhost:3000"));