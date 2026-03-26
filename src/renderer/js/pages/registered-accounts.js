import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { TFSA_LIMITS, RESP, FHSA } from '../canadian/constants.js';
import { calculateCurrentTFSARoom, calculateCurrentRRSPRoom, calculateCurrentFHSARoom, calculateCESGDetails, calculateGICMaturity } from '../canadian/calculators.js';

let activeTab = 'tfsa';

export function setRegTab(tab) { activeTab = tab; }
export function getRegTab() { return activeTab; }

export function renderRegisteredAccounts(state) {
  const tabs = ['tfsa', 'rrsp', 'resp', 'fhsa', 'gics'];
  const tabLabels = { tfsa: 'TFSA', rrsp: 'RRSP', resp: 'RESP', fhsa: 'FHSA', gics: 'GICs' };

  return `
    <div style="display:flex;gap:6px;margin-bottom:18px">
      ${tabs.map(t => `
        <button class="btn ${activeTab === t ? 'btn-primary' : 'btn-secondary'}" data-action="set-reg-tab" data-tab="${t}">
          ${tabLabels[t]}
        </button>`).join('')}
    </div>
    ${activeTab === 'tfsa' ? renderTFSA(state) : ''}
    ${activeTab === 'rrsp' ? renderRRSP(state) : ''}
    ${activeTab === 'resp' ? renderRESP(state) : ''}
    ${activeTab === 'fhsa' ? renderFHSA(state) : ''}
    ${activeTab === 'gics' ? renderGICs(state) : ''}
  `;
}

function renderTFSA(state) {
  const room = state.contributionRoom.find(r => r.account_type === 'tfsa');
  const currentYear = new Date().getFullYear();
  const annualLimit = TFSA_LIMITS[currentYear] || 0;

  if (!room) {
    return `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">${icon('piggy-bank', 40)}</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Track Your TFSA</div>
        <div style="color:var(--sub);font-size:13px;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto;line-height:1.6">
          Set your known TFSA contribution room from CRA My Account, then log contributions to keep track.
        </div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="contribution-room">
          ${icon('plus', 14)} Set Contribution Room
        </button>
      </div>`;
  }

  const calc = calculateCurrentTFSARoom(room.known_room, room.known_as_of_date, state.contributions);
  const tfsaInvestments = state.investments.filter(i => i.account_type === 'tfsa');
  const tfsaContributions = state.contributions.filter(c => c.account_type === 'tfsa');
  const investedValue = tfsaInvestments.reduce((s, i) => s + i.shares * i.current_price, 0);

  return `
    <div class="grid4" style="margin-bottom:16px">
      ${statCard('Known Room', fmt(calc.knownRoom), 'var(--accent)', `As of ${room.known_as_of_date}`)}
      ${statCard('Contributed Since', fmt(calc.contributedSince), '#6366f1', `After ${room.known_as_of_date}`)}
      ${statCard('Current Room', fmt(calc.currentRoom), calc.currentRoom > 0 ? 'var(--green)' : 'var(--red)', `${currentYear} limit: ${fmt(annualLimit)}`)}
      ${statCard('Invested Value', fmt(investedValue), '#8b5cf6', `${tfsaInvestments.length} holding(s)`)}
    </div>
    <div style="display:flex;gap:14px;margin-bottom:16px">
      <button class="btn btn-primary" data-action="open-modal" data-modal="tfsa-contribution">${icon('plus', 14)} Log Contribution</button>
      <button class="btn btn-secondary" data-action="open-modal" data-modal="contribution-room">${icon('settings', 14)} Update Room</button>
    </div>
    ${tfsaInvestments.length > 0 ? `
      <div class="card" style="margin-bottom:14px">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px">TFSA Holdings</div>
        <div class="inv-grid inv-head">
          <span>Symbol</span><span>Shares</span><span>Avg Cost</span><span>Price</span><span>Value</span><span>Return</span><span></span>
        </div>
        ${tfsaInvestments.map(i => {
          const v = i.shares * i.current_price;
          const c = i.shares * i.avg_cost;
          const r = c > 0 ? ((v - c) / c * 100) : 0;
          return `<div class="inv-grid">
            <span class="mono" style="font-weight:700">${h(i.symbol)}</span>
            <span>${i.shares}</span>
            <span class="mono" style="font-size:11px">${fmt(i.avg_cost)}</span>
            <span class="mono" style="font-size:11px">${fmt(i.current_price)}</span>
            <span class="mono" style="font-weight:600;font-size:11px">${fmt(v)}</span>
            <span class="mono" style="font-weight:600;font-size:11px;color:${r >= 0 ? 'var(--green)' : 'var(--red)'}">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</span>
            <span></span>
          </div>`;
        }).join('')}
      </div>` : ''}
    ${renderContributionHistory(tfsaContributions, 'tfsa')}
  `;
}

function renderRRSP(state) {
  const room = state.contributionRoom.find(r => r.account_type === 'rrsp');

  if (!room) {
    return `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">${icon('piggy-bank', 40)}</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Track Your RRSP</div>
        <div style="color:var(--sub);font-size:13px;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto;line-height:1.6">
          Set your known RRSP deduction limit from your CRA Notice of Assessment, then log contributions.
        </div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="contribution-room">
          ${icon('plus', 14)} Set Contribution Room
        </button>
      </div>`;
  }

  const calc = calculateCurrentRRSPRoom(room.known_room, room.known_as_of_date, state.contributions);
  const rrspInvestments = state.investments.filter(i => i.account_type === 'rrsp');
  const rrspContributions = state.contributions.filter(c => c.account_type === 'rrsp');
  const investedValue = rrspInvestments.reduce((s, i) => s + i.shares * i.current_price, 0);

  return `
    ${calc.overcontributed ? `
      <div class="card" style="border-color:var(--red);background:rgba(239,68,68,0.06);margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:8px;color:var(--red);font-weight:700;font-size:14px">
          ${icon('alert-triangle', 16)} Overcontribution Warning
        </div>
        <div style="color:var(--sub);font-size:12px;margin-top:6px;line-height:1.5">
          You are ${fmt(calc.overcontributionAmount)} over the $2,000 buffer. CRA charges 1% per month on excess amounts.
        </div>
      </div>` : ''}
    <div class="grid4" style="margin-bottom:16px">
      ${statCard('Known Room', fmt(calc.knownRoom), 'var(--accent)', `As of ${room.known_as_of_date}`)}
      ${statCard('Contributed Since', fmt(calc.contributedSince), '#6366f1', `After ${room.known_as_of_date}`)}
      ${statCard('Current Room', fmt(calc.currentRoom), calc.currentRoom > 0 ? 'var(--green)' : 'var(--red)', `Max: ${fmt(calc.maxDeduction)}`)}
      ${statCard('Invested Value', fmt(investedValue), '#8b5cf6', `${rrspInvestments.length} holding(s)`)}
    </div>
    <div style="display:flex;gap:14px;margin-bottom:16px">
      <button class="btn btn-primary" data-action="open-modal" data-modal="rrsp-contribution">${icon('plus', 14)} Log Contribution</button>
      <button class="btn btn-secondary" data-action="open-modal" data-modal="contribution-room">${icon('settings', 14)} Update Room</button>
      <button class="btn btn-secondary" data-action="nav-to-tax">${icon('wallet', 14)} RRSP Tax Impact</button>
    </div>
    ${rrspInvestments.length > 0 ? `
      <div class="card" style="margin-bottom:14px">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px">RRSP Holdings</div>
        <div class="inv-grid inv-head">
          <span>Symbol</span><span>Shares</span><span>Avg Cost</span><span>Price</span><span>Value</span><span>Return</span><span></span>
        </div>
        ${rrspInvestments.map(i => {
          const v = i.shares * i.current_price;
          const c = i.shares * i.avg_cost;
          const r = c > 0 ? ((v - c) / c * 100) : 0;
          return `<div class="inv-grid">
            <span class="mono" style="font-weight:700">${h(i.symbol)}</span>
            <span>${i.shares}</span>
            <span class="mono" style="font-size:11px">${fmt(i.avg_cost)}</span>
            <span class="mono" style="font-size:11px">${fmt(i.current_price)}</span>
            <span class="mono" style="font-weight:600;font-size:11px">${fmt(v)}</span>
            <span class="mono" style="font-weight:600;font-size:11px;color:${r >= 0 ? 'var(--green)' : 'var(--red)'}">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</span>
            <span></span>
          </div>`;
        }).join('')}
      </div>` : ''}
    ${renderContributionHistory(rrspContributions, 'rrsp')}
  `;
}

function renderRESP(state) {
  const respContributions = state.contributions.filter(c => c.account_type === 'resp');

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:12px;color:var(--sub)">RESP - Registered Education Savings Plan</div>
        <div style="font-size:13px;color:var(--sub);margin-top:4px">CESG: 20% match on first $2,500/year per child (max $7,200 lifetime)</div>
      </div>
      <button class="btn btn-primary" data-action="open-modal" data-modal="resp-beneficiary">${icon('plus', 14)} Add Beneficiary</button>
    </div>
    ${state.respBeneficiaries.length === 0 ? `
      <div class="card empty">
        <div style="margin-bottom:8px">${icon('book-open', 24)}</div>
        No beneficiaries yet. Add a child to start tracking RESP contributions and CESG.
      </div>` : ''}
    ${state.respBeneficiaries.map(b => {
      const cesg = calculateCESGDetails(b);
      const pctCesg = RESP.CESG_LIFETIME_MAX > 0 ? ((b.total_cesg_received || 0) / RESP.CESG_LIFETIME_MAX * 100) : 0;
      const pctContrib = RESP.LIFETIME_LIMIT > 0 ? ((b.total_contributions || 0) / RESP.LIFETIME_LIMIT * 100) : 0;
      return `
        <div class="card" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
            <div>
              <div style="font-weight:700;font-size:16px">${h(b.name)}</div>
              <div style="color:var(--sub);font-size:12px">Age ${cesg.age} (born ${b.birth_year}) ${cesg.isEligible ? `- ${cesg.yearsRemaining} years of CESG remaining` : '- CESG no longer eligible'}</div>
            </div>
            <button style="background:none;border:none;color:var(--muted)" data-action="delete-resp-beneficiary" data-id="${b.id}">${icon('trash-2', 14)}</button>
          </div>
          <div class="grid3" style="margin-bottom:14px">
            <div>
              <div style="font-size:11px;color:var(--sub);margin-bottom:4px">Total Contributions</div>
              <div class="mono" style="font-size:16px;font-weight:700">${fmt(b.total_contributions || 0)}</div>
              <div class="progress-bg" style="height:4px;margin-top:6px"><div class="progress-fill" style="width:${Math.min(100, pctContrib)}%;background:#6366f1"></div></div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">${fmt(cesg.lifetimeContribRoom)} room remaining</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--sub);margin-bottom:4px">CESG Received</div>
              <div class="mono" style="font-size:16px;font-weight:700;color:var(--green)">${fmt(b.total_cesg_received || 0)}</div>
              <div class="progress-bg" style="height:4px;margin-top:6px"><div class="progress-fill" style="width:${Math.min(100, pctCesg)}%;background:var(--green)"></div></div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">${fmt(cesg.cesgRemaining)} CESG remaining</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--sub);margin-bottom:4px">Optimal This Year</div>
              <div class="mono" style="font-size:16px;font-weight:700;color:var(--accent)">${fmt(cesg.contributionForMaxCesg)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:8px">For max ${fmt(cesg.cesgThisYear)} CESG</div>
            </div>
          </div>
          <div style="margin-top:14px;padding:12px;background:var(--input);border-radius:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:12px;font-weight:600">Lifetime CESG Progress</div>
              <div class="mono" style="font-size:12px;color:var(--sub)">${fmt(b.total_cesg_received || 0)} / ${fmt(RESP.CESG_LIFETIME_MAX)}</div>
            </div>
            <div class="progress-bg" style="height:8px">
              <div class="progress-fill" style="width:${Math.min(100, pctCesg)}%;background:${pctCesg > 90 ? 'var(--orange)' : 'var(--green)'}"></div>
            </div>
            ${pctCesg > 90 ? '<div style="font-size:10px;color:var(--orange);margin-top:4px">Approaching CESG lifetime maximum</div>' : ''}
            ${cesg.cesgThisYear > 0 ? `<div style="font-size:10px;color:var(--sub);margin-top:4px">Contribute ${fmt(cesg.contributionForMaxCesg)} this year for max ${fmt(cesg.cesgThisYear)} CESG</div>` : '<div style="font-size:10px;color:var(--muted);margin-top:4px">CESG cap reached for this year</div>'}
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" data-action="open-modal" data-modal="resp-contribution">${icon('plus', 12)} Log Contribution</button>
        </div>`;
    }).join('')}
    ${respContributions.length > 0 ? renderContributionHistory(respContributions, 'resp') : ''}
  `;
}

function renderFHSA(state) {
  const room = state.contributionRoom.find(r => r.account_type === 'fhsa');

  if (!room) {
    return `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">${icon('home', 40)}</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Track Your FHSA</div>
        <div style="color:var(--sub);font-size:13px;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto;line-height:1.6">
          The First Home Savings Account lets you save up to $40,000 tax-free for your first home.
          Set your known contribution room to start tracking.
        </div>
        <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:10px;padding:12px 16px;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto">
          <div style="font-size:12px;color:var(--sub);line-height:1.5">
            ${icon('info', 14)} Available to Canadian residents aged 18+ who haven't owned a home
          </div>
        </div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="contribution-room">
          ${icon('plus', 14)} Set Contribution Room
        </button>
      </div>`;
  }

  const calc = calculateCurrentFHSARoom(room.known_room, room.known_as_of_date, state.contributions);
  const fhsaInvestments = state.investments.filter(i => i.account_type === 'fhsa');
  const fhsaContributions = state.contributions.filter(c => c.account_type === 'fhsa');
  const investedValue = fhsaInvestments.reduce((s, i) => s + i.shares * i.current_price, 0);
  const lifetimeContributed = (state.contributions || [])
    .filter(c => c.account_type === 'fhsa')
    .reduce((sum, c) => sum + c.amount, 0);
  const lifetimeRemaining = Math.max(0, FHSA.LIFETIME_LIMIT - lifetimeContributed);
  const lifetimePct = FHSA.LIFETIME_LIMIT > 0 ? Math.min(100, Math.round(lifetimeContributed / FHSA.LIFETIME_LIMIT * 100)) : 0;

  return `
    <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:10px;padding:12px 16px;margin-bottom:16px">
      <div style="font-size:12px;color:var(--sub);line-height:1.5">
        ${icon('info', 14)} <strong>FHSA</strong> - Available to Canadian residents who haven't owned a home. $${FHSA.ANNUAL_LIMIT.toLocaleString()}/year, $${FHSA.LIFETIME_LIMIT.toLocaleString()} lifetime. Unused room carries forward (max $${FHSA.CARRYFORWARD_MAX.toLocaleString()}).
      </div>
    </div>
    <div class="grid4" style="margin-bottom:16px">
      ${statCard('Known Room', fmt(calc.knownRoom), 'var(--accent)', `As of ${room.known_as_of_date}`)}
      ${statCard('Contributed Since', fmt(calc.contributedSince), '#6366f1', `After ${room.known_as_of_date}`)}
      ${statCard('Current Room', fmt(calc.currentRoom), calc.currentRoom > 0 ? 'var(--green)' : 'var(--red)', `Annual limit: ${fmt(calc.annualLimit)}`)}
      ${statCard('Invested Value', fmt(investedValue), '#8b5cf6', `${fhsaInvestments.length} holding(s)`)}
    </div>
    <div class="card" style="margin-bottom:16px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600">Lifetime Contribution Progress</div>
        <div class="mono" style="font-size:12px;color:var(--sub)">${fmt(lifetimeContributed)} / ${fmt(FHSA.LIFETIME_LIMIT)}</div>
      </div>
      <div class="progress-bg" style="height:8px">
        <div class="progress-fill" style="width:${lifetimePct}%;background:#6366f1"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px">${fmt(lifetimeRemaining)} lifetime room remaining</div>
    </div>
    <div style="display:flex;gap:14px;margin-bottom:16px">
      <button class="btn btn-primary" data-action="open-modal" data-modal="fhsa-contribution">${icon('plus', 14)} Log Contribution</button>
      <button class="btn btn-secondary" data-action="open-modal" data-modal="contribution-room">${icon('settings', 14)} Update Room</button>
    </div>
    ${fhsaInvestments.length > 0 ? `
      <div class="card" style="margin-bottom:14px">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px">FHSA Holdings</div>
        <div class="inv-grid inv-head">
          <span>Symbol</span><span>Shares</span><span>Avg Cost</span><span>Price</span><span>Value</span><span>Return</span><span></span>
        </div>
        ${fhsaInvestments.map(i => {
          const v = i.shares * i.current_price;
          const c = i.shares * i.avg_cost;
          const r = c > 0 ? ((v - c) / c * 100) : 0;
          return `<div class="inv-grid">
            <span class="mono" style="font-weight:700">${h(i.symbol)}</span>
            <span>${i.shares}</span>
            <span class="mono" style="font-size:11px">${fmt(i.avg_cost)}</span>
            <span class="mono" style="font-size:11px">${fmt(i.current_price)}</span>
            <span class="mono" style="font-weight:600;font-size:11px">${fmt(v)}</span>
            <span class="mono" style="font-weight:600;font-size:11px;color:${r >= 0 ? 'var(--green)' : 'var(--red)'}">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</span>
            <span></span>
          </div>`;
        }).join('')}
      </div>` : ''}
    ${renderContributionHistory(fhsaContributions, 'fhsa')}
  `;
}

function renderGICs(state) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:12px;color:var(--sub)">GIC Tracker - Guaranteed Investment Certificates</div>
      </div>
      <button class="btn btn-primary" data-action="open-modal" data-modal="gic">${icon('plus', 14)} Add GIC</button>
    </div>
    ${state.gics.length === 0 ? `
      <div class="card empty">
        <div style="margin-bottom:8px">${icon('lock', 24)}</div>
        No GICs tracked yet. Add your GICs to monitor maturity dates and interest.
      </div>` : ''}
    ${state.gics.map(g => {
      const calc = calculateGICMaturity(g);
      return `
        <div class="card gic-card" style="margin-bottom:14px;border-left:3px solid ${calc.statusColor}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:15px">${h(g.institution)} - ${fmt(g.principal)}</div>
              <div style="color:var(--sub);font-size:12px;margin-top:2px">
                ${g.rate}% for ${g.term_months} months
                ${g.account_type !== 'non-registered' ? `<span class="tag">${g.account_type.toUpperCase()}</span>` : ''}
                ${g.is_cashable ? '<span class="tag">Cashable</span>' : ''}
              </div>
            </div>
            <button style="background:none;border:none;color:var(--muted)" data-action="delete-gic" data-id="${g.id}">${icon('trash-2', 14)}</button>
          </div>
          <div class="grid4" style="margin-top:14px">
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Maturity</div>
              <div class="mono" style="font-size:13px;font-weight:600;color:${calc.statusColor}">${g.maturity_date}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Days Left</div>
              <div class="mono" style="font-size:13px;font-weight:600;color:${calc.statusColor}">${calc.daysRemaining}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Interest</div>
              <div class="mono" style="font-size:13px;font-weight:600;color:var(--green)">${fmt(calc.interestEarned)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">At Maturity</div>
              <div class="mono" style="font-size:13px;font-weight:600">${fmt(calc.maturityValue)}</div>
            </div>
          </div>
          <div class="progress-bg" style="height:4px;margin-top:12px">
            <div class="progress-fill" style="width:${calc.progressPercent}%;background:${calc.statusColor}"></div>
          </div>
        </div>`;
    }).join('')}
  `;
}

function renderContributionHistory(contributions, type) {
  if (contributions.length === 0) return '';
  const label = type.toUpperCase();
  return `
    <div class="card" style="padding:0">
      <div style="padding:14px 16px;font-weight:700;font-size:13px;border-bottom:1px solid var(--border)">${label} Contribution History</div>
      ${contributions.map(c => `
        <div class="tx-row">
          <div class="tx-icon" style="background:${type === 'tfsa' ? '#10b98118' : type === 'rrsp' ? '#6366f118' : type === 'fhsa' ? '#8b5cf618' : '#f59e0b18'}">
            ${icon('arrow-up-right', 14)}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${h(c.description || `${label} Deposit`)}</div>
            <div style="font-size:11px;color:var(--sub)">${c.date}${c.institution ? ` - ${c.institution}` : ''}</div>
          </div>
          <div class="mono" style="font-weight:700;color:var(--green)">${fmt(c.amount)}</div>
          <button style="background:none;border:none;color:var(--muted);margin-left:8px" data-action="delete-contribution" data-id="${c.id}">${icon('trash-2', 12)}</button>
        </div>`).join('')}
    </div>`;
}

function statCard(label, value, color, sub) {
  return `
    <div class="card" style="padding:16px">
      <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
      <div class="mono" style="font-size:20px;font-weight:800;color:${color};letter-spacing:-0.5px">${value}</div>
      ${sub ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">${sub}</div>` : ''}
    </div>`;
}
