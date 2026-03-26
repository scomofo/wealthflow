// Recurring Payment Detection Modal for WealthFlow
import { icon } from '../icons.js';
import { h, fmt } from '../helpers.js';

const FREQ_LABELS = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

const FREQ_COLORS = {
  weekly: '#6366f1',
  biweekly: '#8b5cf6',
  monthly: '#d4a843',
  quarterly: '#10b981',
  annual: '#ec4899',
};

export function renderRecurringModal(data) {
  if (!data) return '';

  const { patterns, selected } = data;
  const newPatterns = patterns.filter(p => !p.alreadyTracked);
  const trackedPatterns = patterns.filter(p => p.alreadyTracked);

  return `<div class="modal-overlay" data-action="close-recurring-modal">
    <div class="import-modal" onclick="event.stopPropagation()">
      <div class="modal-head">
        <div class="modal-title">${icon('search', 18)} Detected Recurring Payments</div>
        <button style="background:none;border:none;color:var(--sub);cursor:pointer" data-action="close-recurring-modal">${icon('x', 18)}</button>
      </div>

      ${patterns.length === 0 ? `
        <div style="text-align:center;padding:40px 20px;color:var(--sub)">
          <div style="font-size:36px;margin-bottom:12px">${icon('search', 36)}</div>
          <div style="font-size:14px;font-weight:500;margin-bottom:6px">No recurring payments detected</div>
          <div style="font-size:12px">Import more transactions to help identify patterns.</div>
        </div>
      ` : `
        <div style="font-size:12px;color:var(--sub);margin-bottom:14px;line-height:1.5">
          Found ${newPatterns.length} recurring payment${newPatterns.length !== 1 ? 's' : ''} in your transactions.
          Select the ones you'd like to track as bill reminders.
        </div>

        ${newPatterns.length > 0 ? `
          <div class="import-table-wrap">
            <table class="import-table">
              <thead>
                <tr>
                  <th style="width:32px"><input type="checkbox" data-action="recurring-select-all" ${selected.size === newPatterns.length ? 'checked' : ''}></th>
                  <th>Payment</th>
                  <th>Frequency</th>
                  <th style="text-align:right">Amount</th>
                  <th>Confidence</th>
                  <th>Next Due</th>
                </tr>
              </thead>
              <tbody>
                ${newPatterns.map(p => `
                  <tr>
                    <td><input type="checkbox" data-action="recurring-select" data-id="${h(p.id)}" ${selected.has(p.id) ? 'checked' : ''}></td>
                    <td>
                      <div style="font-weight:500;font-size:12.5px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h(p.description)}">${h(p.description)}</div>
                      <div style="font-size:10px;color:var(--sub)">${p.occurrences}x seen · ${h(p.category)}</div>
                    </td>
                    <td><span style="background:${FREQ_COLORS[p.frequency]}22;color:${FREQ_COLORS[p.frequency]};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:500">${FREQ_LABELS[p.frequency]}</span></td>
                    <td style="text-align:right;font-weight:500">
                      ${p.isFixedAmount ? fmt(p.avgAmount) : `${fmt(p.minAmount)} - ${fmt(p.maxAmount)}`}
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:4px">
                        <div style="width:40px;height:4px;border-radius:2px;background:var(--border);overflow:hidden">
                          <div style="height:100%;width:${p.consistency}%;background:${p.consistency >= 80 ? 'var(--green, #10b981)' : p.consistency >= 60 ? '#f59e0b' : 'var(--red, #ef4444)'}"></div>
                        </div>
                        <span style="font-size:10px;color:var(--sub)">${p.consistency}%</span>
                      </div>
                    </td>
                    <td style="font-size:12px">${p.nextDate}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${trackedPatterns.length > 0 ? `
          <div style="margin-top:14px;padding:10px 14px;background:var(--input);border-radius:10px;font-size:12px;color:var(--sub)">
            ${icon('check', 12)} ${trackedPatterns.length} recurring payment${trackedPatterns.length !== 1 ? 's' : ''} already tracked as reminders:
            ${trackedPatterns.map(p => `<strong>${h(p.description)}</strong>`).join(', ')}
          </div>
        ` : ''}
      `}

      <div class="import-actions" style="margin-top:16px">
        <button class="btn btn-secondary" data-action="close-recurring-modal">Cancel</button>
        ${newPatterns.length > 0 ? `
          <button class="btn btn-primary" data-action="confirm-recurring" ${selected.size === 0 ? 'disabled' : ''} style="min-width:180px;justify-content:center">
            ${icon('plus', 15)} Create ${selected.size} Reminder${selected.size !== 1 ? 's' : ''}
          </button>
        ` : ''}
      </div>
    </div>
  </div>`;
}
