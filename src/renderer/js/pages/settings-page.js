// Settings Page
import { icon } from '../icons.js';
import { h } from '../helpers.js';
import { PROVINCES } from '../canadian/constants.js';

const AI_MODELS = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Recommended)', desc: 'Fast, smart, cost-effective' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: 'Fastest, cheapest' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', desc: 'Most capable, highest cost' },
];

export function renderSettings(state) {
  const s = state.settings || {};
  const hasKey = !!s.ai_api_key;
  const maskedKey = hasKey ? s.ai_api_key.slice(0, 10) + '...' + s.ai_api_key.slice(-4) : '';

  return `
    <div style="max-width:600px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px;display:flex;align-items:center;gap:6px">${icon('settings', 16)} Profile</div>
        <div class="input-label">Your Name</div>
        <input class="input-field settings-input" data-field="user_name" value="${h(s.user_name || '')}" placeholder="Enter your name" style="margin-bottom:12px">
        <div class="input-label">Province</div>
        <select class="input-field settings-input" data-field="province" style="margin-bottom:12px">
          ${PROVINCES.map(p => `<option value="${p.code}" ${s.province === p.code ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);cursor:pointer">
            <input type="checkbox" class="settings-input" data-field="dark_mode" ${s.dark_mode ? 'checked' : ''}> Dark Mode
          </label>
        </div>
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px;display:flex;align-items:center;gap:6px">${icon('lightbulb', 16, 'var(--accent)')} AI Advisor</div>
        <div style="font-size:11px;color:var(--sub);margin-bottom:14px;line-height:1.5">
          Connect your Anthropic API key to power the AI financial advisor with Claude. Your key is stored locally and never shared.
        </div>
        <div class="input-label">Claude API Key</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input class="input-field" id="ai-key-input" type="password" placeholder="${hasKey ? maskedKey : 'sk-ant-...'}" style="flex:1;font-family:monospace;font-size:12px">
          <button class="btn btn-primary" style="padding:8px 14px;white-space:nowrap" data-action="save-ai-key">${hasKey ? 'Update' : 'Save'} Key</button>
        </div>
        ${hasKey ? `<div style="font-size:11px;color:var(--green);margin-bottom:12px;display:flex;align-items:center;gap:4px">${icon('check-circle', 12, 'var(--green)')} API key configured</div>` : ''}
        <div class="input-label">AI Model</div>
        <select class="input-field settings-input" data-field="ai_model" style="margin-bottom:8px">
          ${AI_MODELS.map(m => `<option value="${m.id}" ${s.ai_model === m.id ? 'selected' : ''}>${m.name} — ${m.desc}</option>`).join('')}
        </select>
        <div style="font-size:10px;color:var(--sub);margin-top:4px">
          Get an API key at <span style="color:var(--accent);font-weight:500">console.anthropic.com</span>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
          <div class="input-label">Knowledge Base</div>
          <div style="font-size:11px;color:var(--sub);margin-bottom:8px">Reload the AI knowledge base files from disk (e.g. after editing tax law or debt advice files).</div>
          <button class="btn btn-secondary" data-action="reload-knowledge">${icon('refresh-cw', 12)} Reload Knowledge Base</button>
        </div>
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px;display:flex;align-items:center;gap:6px">${icon('download', 16)} Data Management</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" data-action="export-json">${icon('download', 12)} Backup (JSON)</button>
          <button class="btn btn-secondary" data-action="export-csv">${icon('download', 12)} Export CSV</button>
          <button class="btn btn-secondary" data-action="import-csv">${icon('upload', 12)} Import Data</button>
          <button class="btn btn-secondary" data-action="export-pdf">${icon('file-text', 12)} PDF Report</button>
        </div>
      </div>
      <div class="card danger-zone">
        <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:var(--red);display:flex;align-items:center;gap:6px">${icon('alert-triangle', 16)} Danger Zone</div>
        <div style="font-size:12px;color:var(--sub);margin-bottom:12px">This will permanently delete all your data and reset the app.</div>
        <button class="btn btn-danger" data-action="reset-all">${icon('trash-2', 12)} Reset All Data</button>
      </div>
    </div>`;
}
