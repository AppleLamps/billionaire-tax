# Billionaire Tax Act Viewer

Single-page reader for the 2026 Billionaire Tax Act (Initiative No. 25-0024) with a fixed layout, scrollable bill panel, table of contents, and AI-powered chat assistant.

## Features

- **Bill Reader** - Clean, scrollable view of the full bill text
- **Table of Contents** - Jump to any section
- **Highlights** - Key provisions highlighted with explanations
- **Bill Chat** - AI chatbot powered by Grok 4.1 for questions about the bill

## Files

```
├── index.html              # Main page markup
├── styles.css              # Layout and theme styles
├── script.js               # Bill parsing, rendering, and chat
├── billionaires tax.txt    # Source bill text
├── api/
│   └── chat.js             # Vercel serverless function for chat API
├── vercel.json             # Vercel deployment config
├── .env                    # Environment variables (not committed)
└── .gitignore
```

## Local Development

### Option 1: Simple HTTP Server (no chat)

```bash
python -m http.server
```

Then open `http://localhost:8000`. Chat will not work without the API.

### Option 2: With Chat (Local API Key)

1. Open `script.js` and find `LOCAL_XAI_API_KEY`
2. Set your xAI API key:

   ```js
   const LOCAL_XAI_API_KEY = "xai-your-key-here";
   ```

3. Run a local server and test chat
4. **Remove the key before committing!**

### Option 3: Vercel Dev (Full Stack)

```bash
npx vercel dev
```

Requires `.env` file with `XAI_API_KEY`.

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variable:
   - Name: `XAI_API_KEY`
   - Value: Your xAI API key
4. Deploy

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XAI_API_KEY` | xAI API key for Grok 4.1 | Yes (for chat) |

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- xAI Grok 4.1 (chat model)
- Vercel Serverless Functions
