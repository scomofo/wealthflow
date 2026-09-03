// Converts a dollar amount from an investment's native currency into CAD.
// Investments (and their avg_cost/current_price) are stored and fetched in
// whatever currency the underlying security actually trades in — a USD
// dollar amount summed directly alongside CAD amounts silently understates
// what it's actually worth (USD > CAD historically, so a USD holding's
// value/cost gets undercounted by the gap between the two currencies).
export function convertToCAD(amount, currency, usdCadRate = 1) {
  return currency === 'USD' ? amount * usdCadRate : amount;
}

export function investmentMarketValueCAD(investment, usdCadRate = 1) {
  return convertToCAD((investment.shares || 0) * (investment.current_price || 0), investment.currency, usdCadRate);
}

export function investmentCostBasisCAD(investment, usdCadRate = 1) {
  return convertToCAD((investment.shares || 0) * (investment.avg_cost || 0), investment.currency, usdCadRate);
}
