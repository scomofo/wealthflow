import { icon } from '../icons.js';
import { h } from '../helpers.js';

export function renderEducation(state) {
  // Group education items by type
  const articles = state.education.filter(r => r.type === 'article');
  const videos = state.education.filter(r => r.type === 'video');
  const tools = state.education.filter(r => r.type === 'tool');
  const other = state.education.filter(r => !['article', 'video', 'tool'].includes(r.type));

  const completedCount = state.education.filter(r => r.completed).length;
  const totalCount = state.education.length;

  const renderCard = (r) => `
    <div class="card" style="cursor:pointer;position:relative;${r.completed ? 'opacity:0.75;' : ''}">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:500;background:${r.type === 'video' ? '#ef444418' : r.type === 'tool' ? '#10b98118' : '#6366f118'};color:${r.type === 'video' ? 'var(--red)' : r.type === 'tool' ? 'var(--green)' : 'var(--blue)'}">
          ${r.type}
        </span>
        <span style="font-size:10px;color:var(--muted)">${r.duration}</span>
      </div>
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;line-height:1.3">${h(r.title)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="tag">${r.level}</span>
        <div style="display:flex;align-items:center;gap:3px;font-size:11px">
          ${icon('star', 11, 'var(--orange)')} <span style="font-weight:500">${r.rating}</span>
        </div>
      </div>
      <button class="btn ${r.completed ? 'btn-primary' : 'btn-secondary'}" style="width:100%;justify-content:center;padding:6px 0;font-size:11px" data-action="toggle-education-complete" data-id="${r.id}">
        ${r.completed ? `${icon('check', 12)} Completed` : `${icon('check', 12)} Mark Completed`}
      </button>
    </div>`;

  const renderGroup = (title, items, iconName, color) => {
    if (items.length === 0) return '';
    const groupCompleted = items.filter(r => r.completed).length;
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:28px;height:28px;border-radius:7px;background:${color}18;display:flex;align-items:center;justify-content:center">
            ${icon(iconName, 14, color)}
          </div>
          <div style="font-size:15px;font-weight:600">${title}</div>
          <div style="font-size:11px;color:var(--sub);margin-left:auto">${groupCompleted}/${items.length} completed</div>
        </div>
        <div class="grid3">
          ${items.map(r => renderCard(r)).join('')}
        </div>
      </div>`;
  };

  return `
    <div class="card" style="background:var(--abg);border-color:var(--accent)22">
      <div style="display:flex;gap:14px;align-items:center">
        <div style="width:56px;height:56px;border-radius:13px;background:linear-gradient(135deg,var(--accent),#8b6914);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${icon('book-open', 24, '#0a0b0f')}
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Featured</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:3px">Canadian Financial Literacy Guide</div>
          <div style="font-size:12px;color:var(--sub)">12 modules: TFSA, RRSP, investing, debt, tax optimization, home buying</div>
        </div>
        ${totalCount > 0 ? `
        <div style="text-align:center;flex-shrink:0">
          <div class="mono" style="font-size:22px;font-weight:700;color:var(--accent)">${completedCount}/${totalCount}</div>
          <div style="font-size:10px;color:var(--sub)">completed</div>
        </div>` : ''}
      </div>
    </div>
    ${renderGroup('Articles', articles, 'book-open', 'var(--blue, #6366f1)')}
    ${renderGroup('Videos', videos, 'flame', 'var(--red, #ef4444)')}
    ${renderGroup('Tools & Calculators', tools, 'target', 'var(--green, #10b981)')}
    ${other.length > 0 ? renderGroup('Other', other, 'star', 'var(--orange, #f59e0b)') : ''}
    ${state.education.length === 0 ? '<div class="card empty">No educational content yet</div>' : ''}
    <div class="card">
      <div style="font-weight:600;font-size:15px;margin-bottom:12px">${icon('award', 16, 'var(--accent)')} Canadian Financial Resources</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <a href="https://www.canada.ca/en/revenue-agency.html" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;background:var(--input);text-decoration:none;color:var(--text);transition:background 0.15s" onmouseover="this.style.background='var(--abg)'" onmouseout="this.style.background='var(--input)'">
          <div style="width:36px;height:36px;border-radius:8px;background:#ef444418;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('receipt', 16, 'var(--red)')}
          </div>
          <div>
            <div style="font-size:12.5px;font-weight:600">Canada Revenue Agency (CRA)</div>
            <div style="font-size:10px;color:var(--sub)">canada.ca/taxes &mdash; Tax filing, benefits, credits</div>
          </div>
          <div style="margin-left:auto">${icon('arrow-up-right', 14, 'var(--sub)')}</div>
        </a>
        <a href="https://www.osfi-bsif.gc.ca" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;background:var(--input);text-decoration:none;color:var(--text);transition:background 0.15s" onmouseover="this.style.background='var(--abg)'" onmouseout="this.style.background='var(--input)'">
          <div style="width:36px;height:36px;border-radius:8px;background:#6366f118;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('target', 16, 'var(--blue)')}
          </div>
          <div>
            <div style="font-size:12.5px;font-weight:600">OSFI</div>
            <div style="font-size:10px;color:var(--sub)">osfi-bsif.gc.ca &mdash; Banking & insurance regulation</div>
          </div>
          <div style="margin-left:auto">${icon('arrow-up-right', 14, 'var(--sub)')}</div>
        </a>
        <a href="https://www.cdic.ca" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;background:var(--input);text-decoration:none;color:var(--text);transition:background 0.15s" onmouseover="this.style.background='var(--abg)'" onmouseout="this.style.background='var(--input)'">
          <div style="width:36px;height:36px;border-radius:8px;background:#10b98118;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('piggy-bank', 16, 'var(--green)')}
          </div>
          <div>
            <div style="font-size:12.5px;font-weight:600">CDIC</div>
            <div style="font-size:10px;color:var(--sub)">cdic.ca &mdash; Deposit insurance protection</div>
          </div>
          <div style="margin-left:auto">${icon('arrow-up-right', 14, 'var(--sub)')}</div>
        </a>
        <a href="https://www.canada.ca/en/financial-consumer-agency.html" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;background:var(--input);text-decoration:none;color:var(--text);transition:background 0.15s" onmouseover="this.style.background='var(--abg)'" onmouseout="this.style.background='var(--input)'">
          <div style="width:36px;height:36px;border-radius:8px;background:#f59e0b18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('award', 16, 'var(--orange, #f59e0b)')}
          </div>
          <div>
            <div style="font-size:12.5px;font-weight:600">FCAC</div>
            <div style="font-size:10px;color:var(--sub)">Financial Consumer Agency of Canada</div>
          </div>
          <div style="margin-left:auto">${icon('arrow-up-right', 14, 'var(--sub)')}</div>
        </a>
      </div>
    </div>`;
}
