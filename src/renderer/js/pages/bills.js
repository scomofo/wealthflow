import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';

export function renderBills(state) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(today).padStart(2, '0')}`;

  // Build a map of due dates for the current month from bills with next_due_date
  const dueDateMap = {};
  for (const b of state.bills) {
    const dueDate = b.next_due_date || b.date;
    if (!dueDate) continue;
    const [dy, dm, dd] = dueDate.split('-').map(Number);
    if (dy === year && dm === month + 1) {
      if (!dueDateMap[dd]) dueDateMap[dd] = [];
      dueDateMap[dd].push(b);
    }
  }

  const ge = d => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return state.bills.filter(e => e.date === ds);
  };

  // Sort bills by next_due_date for the sidebar
  const sortedBills = [...state.bills].sort((a, b) => {
    const da = a.next_due_date || a.date || '9999-12-31';
    const db = b.next_due_date || b.date || '9999-12-31';
    return da.localeCompare(db);
  });

  // Calculate days until due for each bill
  const billsWithDaysUntil = sortedBills.map(b => {
    const dueDate = b.next_due_date || b.date;
    if (!dueDate) return { ...b, daysUntil: null, overdue: false };
    const due = new Date(dueDate + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');
    const diffMs = due - todayDate;
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { ...b, daysUntil, overdue: daysUntil < 0 };
  });

  // Separate overdue and upcoming
  const overdueBills = billsWithDaysUntil.filter(b => b.overdue);
  const upcomingBills = billsWithDaysUntil.filter(b => !b.overdue);

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:20px;font-weight:700">${monthName}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" data-action="detect-recurring">${icon('search', 14)} Detect Recurring</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="bill">${icon('plus', 14)} Add</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 280px;gap:16px">
      <div>
        <div class="card" style="padding:0">
          <div style="display:grid;grid-template-columns:repeat(7,1fr)">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d =>
              `<div style="padding:9px 5px;text-align:center;font-size:10.5px;font-weight:600;color:var(--sub);border-bottom:1px solid var(--border)">${d}</div>`
            ).join('')}
            ${Array.from({ length: firstDay }, () =>
              `<div style="padding:8px;border-bottom:1px solid var(--border)"></div>`
            ).join('')}
            ${Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const evs = ge(d);
              const dueBills = dueDateMap[d] || [];
              // Determine dot colors for due dates
              const hasBillDue = dueBills.some(b => b.type === 'bill');
              const hasIncomeDue = dueBills.some(b => b.type === 'income');
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isOverdue = dueBills.length > 0 && dayStr < todayStr;
              return `<div style="padding:7px;min-height:65px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);background:${d === today ? 'var(--abg)' : 'transparent'}">
                <div style="display:flex;align-items:center;gap:3px;margin-bottom:2px">
                  <span style="font-size:11.5px;font-weight:${d === today ? 700 : 400};color:${d === today ? 'var(--accent)' : 'var(--text)'}">${d}</span>
                  ${dueBills.length > 0 ? `<span style="display:flex;gap:2px;align-items:center">${
                    hasBillDue ? `<span style="width:6px;height:6px;border-radius:50%;background:${isOverdue ? 'var(--red)' : '#ef4444'};display:inline-block" title="${dueBills.filter(b=>b.type==='bill').map(b=>b.title).join(', ')}"></span>` : ''
                  }${
                    hasIncomeDue ? `<span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block" title="${dueBills.filter(b=>b.type==='income').map(b=>b.title).join(', ')}"></span>` : ''
                  }</span>` : ''}
                </div>
                ${evs.map(e =>
                  `<div style="font-size:9px;padding:2px 4px;border-radius:3px;margin-bottom:1px;background:${e.type === 'bill' ? '#ef444422' : e.type === 'income' ? '#10b98122' : '#6366f122'};color:${e.type === 'bill' ? 'var(--red)' : e.type === 'income' ? 'var(--green)' : 'var(--blue)'};font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(e.title)}</div>`
                ).join('')}
                ${dueBills.filter(b => !evs.some(e => e.id === b.id)).map(b =>
                  `<div style="font-size:9px;padding:2px 4px;border-radius:3px;margin-bottom:1px;background:${isOverdue ? '#ef444433' : '#f59e0b22'};color:${isOverdue ? 'var(--red)' : 'var(--orange, #f59e0b)'};font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${icon('clock', 8)} ${h(b.title)}</div>`
                ).join('')}
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div style="font-weight:600;font-size:14px;margin-bottom:12px">Upcoming</div>
          ${sortedBills.map(e => {
            const dueDate = e.next_due_date || e.date;
            const isOverdue = dueDate && dueDate < todayStr;
            return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
              <div style="width:34px;height:34px;border-radius:8px;background:${isOverdue ? '#ef444428' : e.type === 'bill' ? '#ef444418' : '#10b98118'};display:flex;align-items:center;justify-content:center">
                ${icon(e.frequency ? 'repeat' : 'clock', 14, isOverdue ? 'var(--red)' : e.type === 'bill' ? 'var(--red)' : 'var(--green)')}
              </div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:12.5px;font-weight:500;color:${isOverdue ? 'var(--red)' : 'var(--text)'}">${h(e.title)}</span>
                  ${e.frequency ? `<span class="recurring-badge">${icon('repeat', 8)} ${e.frequency}</span>` : ''}
                  ${isOverdue ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#ef444422;color:var(--red);font-weight:600">OVERDUE</span>` : ''}
                </div>
                <div style="font-size:10.5px;color:var(--sub)">${dueDate || e.date}${e.category && e.category !== 'Other' ? ` · ${e.category}` : ''}</div>
              </div>
              <div class="mono" style="font-size:13px;font-weight:600;color:${e.type === 'income' ? 'var(--green)' : 'var(--text)'}">
                ${e.type === 'income' ? '+' : '-'}${fmt(e.amount)}
              </div>
              <button class="btn btn-sm btn-secondary" style="padding:4px 8px;font-size:10px" data-action="mark-paid" data-id="${e.id}">${icon('check', 10)} Paid</button>
              <button style="background:none;border:none;color:var(--muted)" data-action="delete-bill" data-id="${e.id}">${icon('trash-2', 12)}</button>
            </div>`;
          }).join('')}
          ${state.bills.length === 0 ? '<div class="empty">No reminders</div>' : ''}
        </div>
      </div>
      <div>
        ${overdueBills.length > 0 ? `
        <div class="card" style="border:1px solid #ef444444;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:13px;margin-bottom:10px;color:var(--red)">
            ${icon('alert-triangle', 14, 'var(--red)')} Overdue Bills
          </div>
          ${overdueBills.map(b => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
              <div style="flex:1">
                <div style="font-size:12px;font-weight:500;color:var(--red)">${h(b.title)}</div>
                <div style="font-size:10px;color:var(--sub)">${Math.abs(b.daysUntil)} day${Math.abs(b.daysUntil) !== 1 ? 's' : ''} overdue${b.frequency ? ` · ${b.frequency}` : ''}</div>
              </div>
              <div class="mono" style="font-size:11px;font-weight:600">${fmt(b.amount)}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        <div class="card">
          <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:13px;margin-bottom:10px">
            ${icon('clock', 14, 'var(--accent)')} Days Until Due
          </div>
          ${upcomingBills.length === 0 && overdueBills.length === 0 ? '<div class="empty" style="font-size:11px">No upcoming bills</div>' : ''}
          ${upcomingBills.map(b => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
              <div style="width:36px;text-align:center">
                <div class="mono" style="font-size:16px;font-weight:700;color:${b.daysUntil <= 3 ? 'var(--red)' : b.daysUntil <= 7 ? 'var(--orange, #f59e0b)' : 'var(--accent)'}">
                  ${b.daysUntil !== null ? b.daysUntil : '?'}
                </div>
                <div style="font-size:8px;color:var(--sub);text-transform:uppercase">day${b.daysUntil !== 1 ? 's' : ''}</div>
              </div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:500">${h(b.title)}</div>
                <div style="font-size:10px;color:var(--sub)">${b.next_due_date || b.date}${b.frequency ? ` · ${b.frequency}` : ''}</div>
              </div>
              <div class="mono" style="font-size:11px;font-weight:600;color:${b.type === 'income' ? 'var(--green)' : 'var(--text)'}">
                ${fmt(b.amount)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}
