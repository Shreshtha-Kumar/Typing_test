// ── State ─────────────────────────────────────────────────────────────────────
let passageText = "";
let startTime   = null;
let testActive  = false;
let lessonCount = 0;
let totalWPM    = 0;
let currentTab  = "login";
const LESSON_SIZE = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showAuthMsg(msg, type) {
  const el = $("authMsg");
  el.textContent = msg;
  el.className = "auth-msg " + (type || "");
}

// ── Password toggle ───────────────────────────────────────────────────────────
function togglePw() {
  const pw = $("password");
  pw.type = pw.type === "password" ? "text" : "password";
}

// ── Tab switch ────────────────────────────────────────────────────────────────
function setTab(tab) {
  currentTab = tab;
  $("tabLogin").classList.toggle("active", tab === "login");
  $("tabRegister").classList.toggle("active", tab === "register");
  $("authBtn").textContent = tab === "login" ? "Login" : "Create Account";
  showAuthMsg("");
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function handleAuth() {
  const username = $("username").value.trim();
  const password = $("password").value;
  if (!username || !password) return showAuthMsg("Fill in both fields", "error");

  const endpoint = currentTab === "login" ? "/login" : "/register";
  try {
    const res  = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.error) return showAuthMsg(data.error, "error");

    if (currentTab === "register") {
      showAuthMsg("Account created! You can now log in.", "success");
      setTab("login");
      return;
    }

    // Logged in
    $("topUser").textContent = username;
    $("auth").classList.add("hidden");
    $("app").classList.remove("hidden");
    lessonCount = 0;
    totalWPM    = 0;
    loadStats();
    startNewTest();
  } catch {
    showAuthMsg("Could not connect to server", "error");
  }
}

async function logout() {
  await fetch("/logout", { method: "POST" }).catch(() => {});
  $("app").classList.add("hidden");
  $("auth").classList.remove("hidden");
  $("username").value = "";
  $("password").value = "";
  showAuthMsg("");
}

// Allow Enter key on auth inputs
["username","password"].forEach(id => {
  $(id)?.addEventListener("keydown", e => { if (e.key === "Enter") handleAuth(); });
});

// ── Passage ───────────────────────────────────────────────────────────────────
async function startNewTest() {
  try {
    const res  = await fetch("/passage");
    const data = await res.json();
    if (data.error) return;
    passageText = data.passage;
  } catch { return; }

  renderPassage();
  $("hiddenInput").value = "";
  startTime  = null;
  testActive = true;
  $("resultLine").textContent = "";
  $("lessonNum").textContent  = lessonCount + 1;
  $("focusHint").classList.remove("hidden-hint");
}

function startTest() {
  lessonCount = 0;
  totalWPM    = 0;
  startNewTest();
}

function renderPassage() {
  const container = $("passage");
  container.innerHTML = "";
  [...passageText].forEach((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch;
    if (i === 0) span.classList.add("current");
    container.appendChild(span);
  });
}

// ── Focus ─────────────────────────────────────────────────────────────────────
function focusInput() {
  $("hiddenInput").focus();
  $("focusHint").classList.add("hidden-hint");
}

// auto-focus on any keypress while app is visible
document.addEventListener("keydown", e => {
  if (!$("app").classList.contains("hidden") && !$("graphModal") || $("graphModal").classList.contains("hidden")) {
    if (e.key.length === 1 || e.key === "Backspace") {
      focusInput();
    }
  }
});

// ── Typing ────────────────────────────────────────────────────────────────────
$("hiddenInput").addEventListener("input", async () => {
  if (!testActive) return;

  const typed = $("hiddenInput").value;
  const spans = $("passage").querySelectorAll("span");

  if (!startTime && typed.length > 0) startTime = Date.now();

  spans.forEach((span, i) => {
    span.classList.remove("correct", "wrong", "current");
    if (i < typed.length) {
      span.classList.add(typed[i] === passageText[i] ? "correct" : "wrong");
    } else if (i === typed.length) {
      span.classList.add("current");
    }
  });

  if (typed.length >= passageText.length) {
    testActive = false;
    const elapsed = (Date.now() - startTime) / 1000;
    const words   = passageText.trim().split(/\s+/).length;
    const wpm     = Math.round((words / elapsed) * 60);
    totalWPM    += wpm;
    lessonCount += 1;

    if (lessonCount < LESSON_SIZE) {
      $("resultLine").textContent = `Passage ${lessonCount}/${LESSON_SIZE} — ${wpm} WPM. Next in 1s…`;
      setTimeout(() => startNewTest(), 1000);
    } else {
      const avgWPM = Math.round(totalWPM / LESSON_SIZE);
      $("resultLine").textContent = `Lesson complete 🎉  Avg: ${avgWPM} WPM`;

      try {
        const res  = await fetch("/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wpm: avgWPM }),
        });
        const data = await res.json();
        if (!data.error) {
          $("statBest").textContent = data.best;
          $("statAvg").textContent  = parseFloat(data.avg).toFixed(0);
        }
      } catch {}

      // Reset for next lesson
      lessonCount = 0;
      totalWPM    = 0;
    }
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch("/stats");
    const data = await res.json();
    if (data.error) return;
    $("statBest").textContent = data.best_wpm || "—";
    $("statAvg").textContent  = data.avg_wpm ? parseFloat(data.avg_wpm).toFixed(0) : "—";
  } catch {}
}

// ── History Graph ─────────────────────────────────────────────────────────────
async function openGraph() {
  $("graphModal").classList.remove("hidden");

  try {
    const res  = await fetch("/history");
    const rows = await res.json();
    const area = $("chartArea");

    if (!rows || rows.length === 0 || rows.error) {
      area.innerHTML = `<p class="chart-empty">No attempts yet. Complete a lesson first.</p>`;
      return;
    }

    const maxWpm = Math.max(...rows.map(r => r.wpm), 1);
    const MAX_BARS = 30; // only show last 30
    const display  = rows.slice(-MAX_BARS);

    area.innerHTML = display.map((row, i) => {
      const heightPct = Math.round((row.wpm / maxWpm) * 100);
      const barH      = Math.max(4, Math.round(heightPct * 1.6)); // max ~160px
      return `
        <div class="chart-bar-wrap" title="Attempt ${i+1}: ${row.wpm} WPM">
          <span class="chart-bar-val">${row.wpm}</span>
          <div class="chart-bar" style="height:${barH}px"></div>
          <span class="chart-bar-idx">${i+1}</span>
        </div>`;
    }).join("");
  } catch {
    $("chartArea").innerHTML = `<p class="chart-empty">Failed to load history.</p>`;
  }
}

function closeGraph() {
  $("graphModal").classList.add("hidden");
}

function closeGraphOutside(e) {
  if (e.target === $("graphModal")) closeGraph();
}

// Close modal with Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeGraph();
});