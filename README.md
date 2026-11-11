# 🧠 SummAInize 

![Version](https://img.shields.io/badge/version-1.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Browser%20Extension-purple.svg)

** Visit & Download your Extension https://summainize.vercel.app **

**SummAInize** is a lightweight Browser Extension that saves your AI conversations when you hit a limit. Instead of starting over and explaining your entire project to a new AI, SummAInize reads the current chat, summarizes the context using Google's Gemini API, and generates a highly structured hand-off prompt.

Just copy, paste, and the new AI will instantly know exactly what you were working on.

---

## 🔑 How the API Key Works (Bring Your Own Key)

**This extension does NOT come with a pre-installed API key.** 
To keep the extension free and your data 100% private, SummAInize uses a **Bring Your Own Key (BYOK)** model. 

1. You use your **own** personal Google Gemini API Key.
2. Your API key is saved securely in your local browser storage (`chrome.storage.local`). It is **never** sent to our servers.
3. Your usage counts against your own Google account's free tier, not ours.

### How to get your FREE Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click the **"Create API Key"** button.
4. Copy the key (it starts with `AIza...`).
5. Open the SummAInize extension, click **Settings**, paste the key, and click **Save settings**.

*(Note: Google's free tier is very generous and sufficient for normal daily usage of this extension).*

---

## ✨ Features

- **AI-Powered Summaries:** Uses Google's `gemini-3.5-flash-lite` model to distill hours of conversation into a concise summary.
- **Context Retention:** Forces the new AI to acknowledge the context and keeps track of goals, exact code snippets, and immediate next steps.
- **Universal:** Works on ChatGPT, Claude, DeepSeek, and Gemini web interfaces.
- **Fallback Mode:** If your API key fails or hits a limit, it automatically switches to a "Trim Only" mode, extracting the raw text without needing an API.
- **Privacy First:** Your chats are never sent to any third-party servers. 

---

## 🛠️ How to Install

### 1. Chrome, Edge, Brave, Opera (Windows, Mac, Linux)
Because SummAInize is in early access, you can install it manually in Developer Mode. It only takes 30 seconds:

1. **Download:** Go to the `website` folder in this repository and download the `SummAInize-Extension.zip` file.
2. **Extract:** Unzip the file into a folder on your computer.
3. **Open Extensions:** Open a new tab and go to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
4. **Developer Mode:** Toggle on **Developer mode** (top-right corner).
5. **Load Extension:** Click **Load unpacked** and select the unzipped folder.
6. **Pin it:** Click the puzzle piece icon 🧩 in your toolbar and pin **SummAInize**.
7. **Add API Key:** Open the extension, click **Settings**, paste your Gemini API Key, and click **Save settings**.

### 2. Safari on macOS (Developer Mode)
Safari does not support loading Chrome extensions by default. However, you can easily test SummAInize temporarily using Safari's built-in Developer features:

1. Open Safari and go to **Settings** (Cmd + ,).
2. Click the **Advanced** tab and check **"Show features for web developers"** at the bottom.
3. Close the Settings window.
4. In the top menu bar, click **Develop** -> **Add Temporary Extension...**
5. Select the folder containing the extension files (`manifest.json`, `main.js`, etc.).
6. Click **Allow** when prompted.
7. The extension icon will appear in your Safari toolbar. *(Note: Because it is temporary, if you restart Safari, you will need to add it again using the Develop menu).*

## 💻 How to Run Locally (For Developers)

If you want to modify the code or host the landing page yourself:

### Project Structure
```text
SummAInize/
├── extension/          # The Chrome Extension source code
│   ├── manifest.json
│   ├── page.html
│   ├── main.js
│   └── style.css
├── website/            # The landing page + downloadable .zip file
│   ├── index.html
│   └── SummAInize-Extension.zip
└── README.md           # Project documentation
