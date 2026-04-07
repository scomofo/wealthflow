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

  // Build query symbols: USD investments keep their symbol as-is,
  // CAD investments without a dot get .TO appended by the stock service.
  // For USD symbols, we need to prevent .TO by adding the exchange explicitly.
  const queryMap = []; // { symbol, querySymbol, inv }
  for (const inv of state.investments) {
    if (!inv.symbol) continue;
    const sym = inv.symbol;
    // Skip non-tradeable (mutual funds, GICs, crypto with custom symbols)
    if (sym.includes('-') || inv.type === 'gic' || inv.type === 'mutual_fund') continue;
    // If already has a dot (e.g., CVO.TO, ZUAG.F), use as-is
    if (sym.includes('.')) {
      queryMap.push({ symbol: sym, querySymbol: sym, inv });
    } else if (inv.currency === 'USD') {
      // US-listed — don't append .TO
      queryMap.push({ symbol: sym, querySymbol: sym, inv });
    } else {
      // Canadian — let stock service append .TO
      queryMap.push({ symbol: sym, querySymbol: sym, inv });
    }
  }

  if (queryMap.length === 0) return [];
  const symbols = queryMap.map(q => q.querySymbol);
  const quotes = await api.fetchBatchQuotes(symbols);

  for (const q of quotes) {
    if (q.error || !q.price) continue;
    const match = queryMap.find(m =>
      m.querySymbol.toUpperCase() === q.symbol?.toUpperCase() ||
      m.querySymbol.toUpperCase() + '.TO' === q.symbol?.toUpperCase()
    );
    if (match) {
      match.inv.current_price = q.price;
      await api.updateInvestment(match.inv);
    }
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
