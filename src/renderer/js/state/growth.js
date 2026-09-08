// Growth domain: investments, goals, contributions, RESP, GICs
let state, api;
export function initGrowth(s, a) { state = s; api = a; }

// Investments
export async function addInvestment(i) {
  await api.addInvestment(i);
  state.investments.push(i);
  state.counts.investments++;
  return i;
}
export async function updateInvestment(i) {
  await api.updateInvestment(i);
  const idx = state.investments.findIndex(x => x.id === i.id);
  if (idx >= 0) state.investments[idx] = i;
  return i;
}
export async function deleteInvestment(id) {
  await api.deleteInvestment(id);
  const prev = state.investments.length;
  state.investments = state.investments.filter(i => i.id !== id);
  if (state.investments.length < prev) state.counts.investments--;
}

// Stock price refresh
export async function refreshStockPrices() {
  if (state.investments.length === 0) return [];

  // Currency is explicit on the holding. Force TSX lookup for CAD holdings
  // without an exchange suffix so symbols that also exist in the US cannot
  // silently resolve to the wrong market.
  const queryMap = [];
  for (const inv of state.investments) {
    if (!inv.symbol) continue;
    const sym = inv.symbol.toUpperCase();
    if (sym.includes('-') || inv.type === 'gic' || inv.type === 'mutual_fund') continue;
    const currency = (inv.currency || 'CAD').toUpperCase();
    const querySymbol = sym.includes('.') || currency === 'USD' ? sym : `${sym}.TO`;
    queryMap.push({ querySymbol, inv });
  }

  if (queryMap.length === 0) return [];

  let usdCadRate = null;
  if (queryMap.some(item => (item.inv.currency || 'CAD').toUpperCase() === 'USD') && api.fetchExchangeRate) {
    const fx = await api.fetchExchangeRate('USD', 'CAD');
    if (fx && Number.isFinite(Number(fx.rate)) && Number(fx.rate) > 0) {
      usdCadRate = Number(fx.rate);
    }
  }

  const quotes = await api.fetchBatchQuotes(queryMap.map(q => q.querySymbol));
  for (const q of quotes) {
    if (q.error || !Number.isFinite(Number(q.price)) || Number(q.price) <= 0) continue;
    const quoteSymbol = String(q.symbol || '').toUpperCase();
    const match = queryMap.find(m => m.querySymbol.toUpperCase() === quoteSymbol);
    if (!match) continue;

    match.inv.current_price = Number(q.price);
    const currency = (q.currency || match.inv.currency || 'CAD').toUpperCase();
    match.inv.currency = currency === 'USD' ? 'USD' : 'CAD';
    if (match.inv.currency === 'USD') {
      match.inv.exchange_rate_to_cad = usdCadRate || match.inv.exchange_rate_to_cad || 1;
    } else {
      match.inv.exchange_rate_to_cad = 1;
    }
    await api.updateInvestment(match.inv);
  }
  return quotes;
}

// Goals
export async function addGoal(g) {
  await api.addGoal(g);
  state.goals.push(g);
  state.counts.goals++;
  return g;
}
export async function updateGoal(g) {
  await api.updateGoal(g);
  const idx = state.goals.findIndex(x => x.id === g.id);
  if (idx >= 0) state.goals[idx] = g;
  return g;
}
export async function deleteGoal(id) {
  await api.deleteGoal(id);
  const prev = state.goals.length;
  state.goals = state.goals.filter(g => g.id !== id);
  if (state.goals.length < prev) state.counts.goals--;
}

// Contribution Room
export async function upsertContributionRoom(cr) {
  await api.upsertContributionRoom(cr);
  state.contributionRoom = await api.getContributionRoom();
  return cr;
}
export async function deleteContributionRoom(id) {
  await api.deleteContributionRoom(id);
  state.contributionRoom = state.contributionRoom.filter(c => c.id !== id);
}

// Contributions
export async function addContribution(c) {
  await api.addContribution(c);
  state.contributions.unshift(c);
  return c;
}
export async function deleteContribution(id) {
  await api.deleteContribution(id);
  state.contributions = state.contributions.filter(c => c.id !== id);
}

// RESP Beneficiaries
export async function addRESPBeneficiary(b) {
  await api.addRESPBeneficiary(b);
  state.respBeneficiaries.push(b);
  return b;
}
export async function updateRESPBeneficiary(b) {
  await api.updateRESPBeneficiary(b);
  const idx = state.respBeneficiaries.findIndex(x => x.id === b.id);
  if (idx >= 0) state.respBeneficiaries[idx] = b;
  return b;
}
export async function deleteRESPBeneficiary(id) {
  await api.deleteRESPBeneficiary(id);
  state.respBeneficiaries = state.respBeneficiaries.filter(b => b.id !== id);
}

// GICs
export async function addGIC(g) {
  await api.addGIC(g);
  state.gics.push(g);
  return g;
}
export async function deleteGIC(id) {
  await api.deleteGIC(id);
  state.gics = state.gics.filter(g => g.id !== id);
}
