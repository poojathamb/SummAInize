const $ = id => document.getElementById(id);
const say = t => $('s').textContent = t;


const HEADER = 
  "### SYSTEM INSTRUCTION: CONTINUATION OF A PREVIOUS CHAT ###\n" +
  "You are taking over a conversation from another AI assistant. The text below is a detailed hand-off summary of the previous context, decisions, and code. " +
  "Read it carefully to understand the user's goals and the current state.\n\n" +
  "DO NOT say 'I cannot see the previous conversation'. Everything you need is right here.\n" +
  "DO NOT start working on the task yet. Instead, reply ONLY with:\n" +
  "1. 'Ready. I have reviewed the context.'\n" +
  "2. A brief 2-sentence recap of the current goal and exact next step so I know you understand.\n\n" +
  "=== START OF PREVIOUS CONTEXT ===\n";

const SUMMARY_PROMPT = 
  "You are a highly advanced AI assistant acting as a bridge between chat sessions. " +
  "Below is a transcript of a conversation (it may contain UI noise, ignore it). " +
  "Your job is to create an exhaustive hand-off summary so that a completely different AI can seamlessly continue the work without asking the user to re-explain anything.\n\n" +
  "Format the summary strictly using this structure:\n" +
  "1. PRIMARY GOAL: What is the user trying to achieve?\n" +
  "2. PERSONA & TONE: How should the AI act? (e.g., Expert Coder, Creative Writer).\n" +
  "3. KEY DECISIONS & CONSTRAINTS: What rules, libraries, or preferences were established?\n" +
  "4. CURRENT STATE: What has been completed so far?\n" +
  "5. EXACT CODE / DATA: Include any specific code blocks, variable names, numbers, or error messages mentioned. DO NOT summarize code—copy it verbatim.\n" +
  "6. IMMEDIATE NEXT STEP: What exactly was the AI or user about to do next?\n\n" +
  "Be precise. Leave out small talk. Keep it under 700 words.\n\n" +
  "=== TRANSCRIPT ===\n";

function scrape() {
  const host = location.host;
  const root = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
  let full = root.innerText;
  
  full = full.replace(/Claude responded:/g, '')
             .replace(/ChatGPT said:/g, '')
             .replace(/You said:/g, '')
             .replace(/Message collapsed/g, '')
             .replace(/Show more/g, '')
             .replace(/Ran \d+ commands, edited a file, shared files/g, '[AI used tools]')
             .replace(/Write a message…/g, '')
             .replace(/Claude is AI and can make mistakes.*/g, '')
             .trim();

  const userSel = host.includes('claude.ai') ? '[data-testid="user-message"]'
    : (host.includes('chatgpt.com') || host.includes('openai.com')) ? '[data-message-author-role="user"]'
    : null;

  if (userSel) {
    const users = [...document.querySelectorAll(userSel)].map(n => n.innerText.trim()).filter(Boolean);
    const idx = []; let pos = 0;
    for (const u of users) {
      const i = full.indexOf(u, pos);
      if (i < 0) continue;
      idx.push([i, u]); pos = i + u.length;
    }
    if (idx.length) {
      const items = [];
      idx.forEach(([i, u], k) => {
        items.push({ role: 'User', text: u });
        const end = k + 1 < idx.length ? idx[k + 1][0] : full.length;
        const ai = full.slice(i + u.length, end).trim();
        if (ai) items.push({ role: 'AI', text: ai });
      });
      return items;
    }
  }
  
  const sel = String(getSelection()).trim();
  return [{ role: 'Chat', text: sel || full }];
}

const trim = (t, max) =>
  t.length <= max ? t : t.slice(0, Math.floor(max * 0.6)) + "\n...[trimmed]...\n" + t.slice(-Math.floor(max * 0.4));

function transcript(items) {
  return items.map(i => `[${i.role}] ${i.text.trim()}`).join('\n\n');
}

function trimOnly(items, budget = 6000) {
  const list = items.map(i => ({ role: i.role, text: trim(i.text.trim(), i.role === 'User' ? 800 : 600) }));
  const fmt = i => `[${i.role}] ${i.text}`;
  if (!list.length) return "";
  const first = list[0], rest = list.slice(1), keep = [];
  let used = fmt(first).length;
  for (let k = rest.length - 1; k >= 0; k--) {
    const s = fmt(rest[k]).length + 2;
    if (used + s > budget) break;
    keep.unshift(rest[k]); used += s;
  }
  return [first, ...keep].map(fmt).join('\n\n');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callGemini(model, key, prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000 }
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error?.message || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    const out = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!out) throw new Error('Empty answer from API');
    return out;
  } finally {
    clearTimeout(timer);
  }
}

async function aiSummary(text) {
  // FIXED: Load the saved API key from chrome storage
  const { key, model, model2 } = await chrome.storage.local.get(['key', 'model', 'model2']);
  
  if (!key) {
    throw new Error('Please open Settings and enter your API key first!');
  }

  const prompt = SUMMARY_PROMPT + trim(text, 40000);
  
  const modelsToTry = [model || 'gemini-3.5-flash-lite'];
  if (model2 && model2 !== modelsToTry[0]) modelsToTry.push(model2);

  let lastErr;
  for (const currentModel of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        say(`Summarizing with ${currentModel} (try ${attempt}/2)...`);
        return await callGemini(currentModel, key, prompt);
      } catch (e) {
        lastErr = e;
        const busy = e.status === 503 || e.status === 429 || e.name === 'AbortError';
        if (!busy) throw e;
        if (attempt === 1) {
          say(`API busy. Waiting 5s before retry...`);
          await sleep(5000);
        }
      }
    }
  }
  throw new Error('Gemini API is busy or rate-limited. ' + (lastErr?.message || ''));
}

async function generate() {
  $('out').value = '';
  $('out').placeholder = 'Generating...'; 
  say('Reading chat...');
  
  let items = [];
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrape });
    items = r[0].result.filter(i => i.text && i.text.trim());
    
    if (!items.length) throw new Error("No text found on this page.");

    if ($('mode').value === 'ai') {
      say('Summarizing with AI...');
      try {
        const aiResult = await aiSummary(transcript(items));
        const final = HEADER + aiResult + "\n\n=== END OF PREVIOUS CONTEXT ===";
        $('out').value = final;
        $('out').placeholder = ''; 
        say(`Ready: ${final.length} chars. Copy and paste into new chat.`);
      } catch (apiError) {
        say('AI failed. Falling back to local trim...');
        const fallbackResult = trimOnly(items);
        const final = HEADER + "[Note: AI summary failed, this is a raw text transcript]\n\n" + fallbackResult + "\n\n=== END OF PREVIOUS CONTEXT ===";
        $('out').value = final;
        $('out').placeholder = '';
        say('Used local trim instead. Press Copy.');
      }
    } else {
      const result = trimOnly(items);
      const final = HEADER + "[Note: This is a raw text transcript]\n\n" + result + "\n\n=== END OF PREVIOUS CONTEXT ===";
      $('out').value = final;
      $('out').placeholder = '';
      say(`Ready: ${final.length} chars. Press Copy.`);
    }
  } catch (e) {
    $('out').placeholder = 'Error occurred. Press Regenerate.';
    say('Error: ' + e.message);
  }
}

$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText($('out').value); }
  catch { $('out').select(); document.execCommand('copy'); }
  say('Copied! Paste it in the new chat.');
};

$('clear').onclick = () => {
  $('out').value = '';
  $('out').placeholder = 'Press Regenerate to start...'; 
  say('Cleared. Ready for a new chat. Press Regenerate to start.');
};

$('savekey').onclick = async () => {
  await chrome.storage.local.set({
    key: $('key').value.trim(),
    model: $('model').value.trim(),
    model2: $('model2') ? $('model2').value.trim() : '' // Safe check if model2 exists
  });
  say('Settings saved successfully!');
};

$('regen').onclick = generate;
$('mode').onchange = generate;

// Load saved settings when the  window opens, then auto-generate
(async () => {
  const { key, model, model2 } = await chrome.storage.local.get(['key', 'model', 'model2']);
  if (key) $('key').value = key;
  if (model) $('model').value = model;
  if (model2) {
    if ($('model2')) $('model2').value = model2;
  }
  
  generate();
})();