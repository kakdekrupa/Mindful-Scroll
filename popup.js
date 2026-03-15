document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Loaded');
  loadState();
  setupEventListeners();
});

function setupEventListeners() {
  const startBtn = document.getElementById('start-btn');
  const endBtn = document.getElementById('end-btn');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');

  if (startBtn) startBtn.addEventListener('click', handleStartSession);
  if (endBtn) endBtn.addEventListener('click', handleEndSession);
  if (saveBtn) saveBtn.addEventListener('click', handleSaveEntry);
  if (clearBtn) clearBtn.addEventListener('click', handleClearData);
}

// --- Start Session ---
function handleStartSession() {
  const mood = document.getElementById('mood-select').value;
  const intent = document.getElementById('intent-input').value || 'General Browsing';
  
  const session = {
    startTime: Date.now(),
    mood: mood,
    intent: intent
  };

  chrome.storage.local.set({ currentSession: session }, () => {
    if (chrome.runtime.lastError) {
      console.error('Storage error:', chrome.runtime.lastError);
      alert('Storage error: ' + chrome.runtime.lastError.message);
      return;
    }
    showView('active-view');
    startTimer(session.startTime);
  });
}

// --- Timer Logic ---
let timerInterval = null;

function startTimer(startTime) {
  const timerEl = document.getElementById('timer');
  if (!timerEl) return;
  
  timerInterval = setInterval(() => {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(diff / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
  }, 1000);
}

// --- End Session ---
function handleEndSession() {
  if (timerInterval) clearInterval(timerInterval);
  showView('reflection-view');
}

// --- Save Entry ---
function handleSaveEntry() {
  const postMood = document.getElementById('post-mood-select').value;
  const help = document.getElementById('help-select').value;
  
  chrome.storage.local.get(['currentSession'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Get error:', chrome.runtime.lastError);
      return;
    }
    
    const session = result.currentSession;
    if (!session) {
      alert('No active session found');
      return;
    }
    
    const endTime = Date.now();
    const duration = endTime - session.startTime;

    const entry = {
      id: Date.now(),
      startTime: session.startTime,
      endTime: endTime,
      duration: duration,
      intent: session.intent,
      startMood: session.mood,
      endMood: postMood,
      helpful: help
    };

    chrome.storage.local.get(['history'], (res) => {
      const history = res.history || [];
      history.unshift(entry);
      
      chrome.storage.local.set({ 
        history: history,
        currentSession: null 
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Set error:', chrome.runtime.lastError);
          return;
        }
        showView('history-view');
        renderHistory();
      });
    });
  });
}

// --- Render History ---
function renderHistory() {
  chrome.storage.local.get(['history'], (res) => {
    const list = document.getElementById('history-list');
    if (!list) return;
    
    list.innerHTML = '';
    const history = res.history || [];
    
    history.slice(0, 10).forEach(item => {
      const date = new Date(item.startTime).toLocaleDateString();
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <strong>${item.intent}</strong>
        <div class="history-meta">${date} • ${Math.floor(item.duration/60)}m • ${item.startMood} ➔ ${item.endMood}</div>
      `;
      list.appendChild(div);
    });
  });
}

function handleClearData() {
  chrome.storage.local.remove(['history', 'currentSession'], () => {
    location.reload();
  });
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

function loadState() {
  chrome.storage.local.get(['currentSession'], (result) => {
    if (result.currentSession) {
      showView('active-view');
      startTimer(result.currentSession.startTime);
    } else {
      showView('idle-view');
    }
  });
}