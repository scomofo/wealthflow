import { icon } from '../icons.js';
import { h } from '../helpers.js';

let aiMsgs = [
  { role: 'ai', text: "Hi! I'm your AI financial advisor powered by Claude. Ask me about budgeting, debt strategy, investing, TFSA/RRSP optimization, Alberta tax law, or savings tips.\n\nMake sure to add your Claude API key in Settings to get started." },
];

let isStreaming = false;
let streamBuffer = '';
let streamCleanups = [];

export function getAiMsgs() { return aiMsgs; }
export function isAiStreaming() { return isStreaming; }

export function addUserMsg(text) {
  aiMsgs.push({ role: 'user', text });
}

export function addAiMsg(text) {
  aiMsgs.push({ role: 'ai', text });
}

export function clearAiHistory() {
  aiMsgs = [
    { role: 'ai', text: "Conversation cleared. How can I help you with your finances?" },
  ];
  isStreaming = false;
  streamBuffer = '';
}

export function startStreaming() {
  isStreaming = true;
  streamBuffer = '';
  aiMsgs.push({ role: 'ai', text: '', streaming: true });
}

export function appendStreamChunk(chunk) {
  streamBuffer += chunk;
  const lastMsg = aiMsgs[aiMsgs.length - 1];
  if (lastMsg && lastMsg.streaming) {
    lastMsg.text = streamBuffer;
  }
  // Update just the streaming message content in DOM
  const streamEl = document.getElementById('ai-stream-msg');
  if (streamEl) {
    streamEl.innerHTML = formatMessage(streamBuffer);
  }
  // Auto-scroll
  const msgs = document.getElementById('ai-msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

export function endStreaming(fullText) {
  isStreaming = false;
  const lastMsg = aiMsgs[aiMsgs.length - 1];
  if (lastMsg && lastMsg.streaming) {
    lastMsg.text = fullText || streamBuffer;
    delete lastMsg.streaming;
  }
  streamBuffer = '';
}

export function handleStreamError(error) {
  isStreaming = false;
  const lastMsg = aiMsgs[aiMsgs.length - 1];
  if (lastMsg && lastMsg.streaming) {
    lastMsg.text = `Error: ${error}`;
    lastMsg.error = true;
    delete lastMsg.streaming;
  }
  streamBuffer = '';
}

export function setupStreamListeners() {
  cleanupStreamListeners();
  const api = window.wealthflow;
  streamCleanups.push(api.onAiStreamChunk(appendStreamChunk));
  streamCleanups.push(api.onAiStreamDone(endStreaming));
  streamCleanups.push(api.onAiStreamError(handleStreamError));
}

export function cleanupStreamListeners() {
  for (const cleanup of streamCleanups) cleanup();
  streamCleanups = [];
}

function formatMessage(text) {
  if (!text) return '';
  // Basic markdown rendering
  let html = h(text);
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--input);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>');
  // Headers: ### text
  html = html.replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;color:var(--accent)">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:14px;margin:10px 0 4px;color:var(--accent)">$1</div>');
  // Bullet points: - text
  html = html.replace(/^- (.+)$/gm, '<div style="padding-left:12px;position:relative;margin:2px 0"><span style="position:absolute;left:0;color:var(--accent)">•</span>$1</div>');
  // Numbered lists: 1. text
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;position:relative;margin:2px 0"><span style="position:absolute;left:0;color:var(--accent);font-weight:600">$1.</span>$2</div>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

export function renderAiPanel(showAI) {
  if (!showAI) return '';
  return `<div class="ai-panel">
    <div class="ai-head">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px">${icon('lightbulb', 15, 'var(--accent)')} AI Advisor</div>
          <div style="font-size:10px;color:var(--sub);margin-top:1px">Powered by Claude — Analyzes your real financial data</div>
        </div>
        <button class="btn-ghost" style="font-size:10px;padding:4px 8px;color:var(--sub);background:none;border:1px solid var(--border);border-radius:6px" data-action="clear-ai-history">${icon('trash-2', 11)} Clear</button>
      </div>
    </div>
    <div class="ai-msgs" id="ai-msgs" role="log">
      ${aiMsgs.map((m, i) => {
        const isLast = i === aiMsgs.length - 1;
        if (m.role === 'user') {
          return `<div class="ai-msg ai-user">${h(m.text)}</div>`;
        }
        const content = m.streaming && isLast
          ? `<div id="ai-stream-msg">${formatMessage(m.text)}</div>`
          : formatMessage(m.text);
        return `<div class="ai-msg ai-bot ${m.error ? 'ai-error' : ''}">${content}</div>`;
      }).join('')}
      ${isStreaming ? `<div class="ai-typing"><span></span><span></span><span></span></div>` : ''}
    </div>
    <div class="ai-foot">
      <input class="input-field" id="ai-input" placeholder="${isStreaming ? 'Thinking...' : 'Ask about your finances...'}" style="flex:1;font-size:12px" ${isStreaming ? 'disabled' : ''} aria-label="Ask AI advisor">
      <button class="btn btn-primary" style="padding:8px 13px" data-action="send-ai" ${isStreaming ? 'disabled' : ''} aria-label="Send message">${isStreaming ? icon('loader', 13) : 'Send'}</button>
    </div>
  </div>`;
}
