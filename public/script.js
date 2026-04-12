let passageText = "";
let startTime = null;
let testActive = false;

let lessonCount = 0;
let totalWPM = 0;
const LESSON_SIZE = 3;

// UI
function togglePassword() {
  password.type = password.type === "password" ? "text" : "password";
}

function showMessage(msg, type) {
  authMessage.innerText = msg;
  authMessage.className = "message " + type;
}

function updateLessonTracker() {
  lessonTracker.innerText = `Lesson ${lessonCount + 1} / ${LESSON_SIZE}`;
}

// AUTH
async function register() {
  const res = await fetch('/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  const data = await res.json();
  data.success
    ? showMessage("User created successfully!", "success")
    : showMessage(data.error, "error");
}

async function login() {
  const res = await fetch('/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  const data = await res.json();

  if (data.success) {
    auth.classList.add('hidden');
    app.classList.remove('hidden');

    lessonCount = 0;
    totalWPM = 0;

    startNewTest();
    loadStats();
  } else {
    showMessage(data.error, "error");
  }
}

// TEST FLOW
async function startNewTest() {
  const res = await fetch('/passage');
  const data = await res.json();

  passageText = data.passage;

  renderPassage();
  updateLessonTracker();

  hiddenInput.value = "";
  hiddenInput.focus();

  startTime = null;
  testActive = true;

  result.innerText = "";
}

function startTest() {
  lessonCount = 0;
  totalWPM = 0;
  startNewTest();
}

// RENDER
function renderPassage() {
  passage.innerHTML = "";

  passageText.split("").forEach((char, i) => {
    const span = document.createElement("span");
    span.innerText = char;

    if (i === 0) span.classList.add("current");

    passage.appendChild(span);
  });
}

// KEYBR STYLE TYPING
hiddenInput.addEventListener("input", async () => {
  const typed = hiddenInput.value;
  const spans = passage.querySelectorAll("span");

  if (!startTime && typed.length > 0) {
    startTime = Date.now();
  }

  spans.forEach((span, i) => {
    span.classList.remove("correct", "wrong", "current");

    const expected = span.innerText;
    const char = typed[i];

    if (char == null) return;

    if (char === expected) {
      span.classList.add("correct");
    } else {
      span.classList.add("wrong");
    }
  });

  const nextIndex = typed.length;

  if (nextIndex < spans.length) {
    spans[nextIndex].classList.add("current");
  }

  // COMPLETE
  if (typed.length >= passageText.length && testActive) {
    testActive = false;

    const time = (Date.now() - startTime) / 1000;
    const words = passageText.split(/\s+/).length;
    const wpm = Math.round((words / time) * 60);

    totalWPM += wpm;
    lessonCount++;

    result.innerText = `Passage ${lessonCount}/${LESSON_SIZE} → WPM: ${wpm}`;

    if (lessonCount < LESSON_SIZE) {
      setTimeout(() => startNewTest(), 800);
    } else {
      const avgLessonWPM = Math.round(totalWPM / LESSON_SIZE);

      result.innerText = `Lesson Complete 🎉 Avg WPM: ${avgLessonWPM}`;

      const res = await fetch('/result', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ wpm: avgLessonWPM })
      });

      const data = await res.json();
      stats.innerText = `Best: ${data.best}, Avg: ${data.avg}`;

      lessonCount = 0;
      totalWPM = 0;
    }
  }
});

// STATS
async function loadStats() {
  const res = await fetch('/stats');
  const data = await res.json();
  stats.innerText = `Best: ${data.best_wpm}, Avg: ${data.avg_wpm}`;
}