// Normalize CAD-denominated book value into the investment's native cost-per-share.
// Wealthsimple Holdings exports label this field "Book Value (CAD)" even for USD
// securities, while investment.avg_cost is stored in the security's native currency.
export function resolveHoldingCostBasis({
  quantity,
  bookValueCad,
  currency = 'CAD',
  exchangeRateToCad,
  existingExchangeRateToCad,
  price,
  marketValue,
  marketValueCurrency,
}) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: 'Holding quantity must be greater than zero.' };
  }
  if (!Number.isFinite(bookValueCad) || bookValueCad < 0) {
    return { error: 'Book Value (CAD) must be a valid non-negative amount.' };
  }

  const normalizedCurrency = String(currency || 'CAD').trim().toUpperCase();
  if (normalizedCurrency !== 'USD') {
    return { avgCost: bookValueCad / quantity, exchangeRateToCad: 1 };
  }

  let rate = Number(exchangeRateToCad);
  if (!Number.isFinite(rate) || rate <= 0) rate = Number(existingExchangeRateToCad);

  // Some statements report market value in CAD but the unit price in USD.
  // This provides a statement-derived rate without reaching out to a live FX feed.
  if ((!Number.isFinite(rate) || rate <= 0)
      && String(marketValueCurrency || '').trim().toUpperCase() === 'CAD'
      && Number.isFinite(marketValue) && marketValue > 0
      && Number.isFinite(price) && price > 0) {
    rate = marketValue / (quantity * price);
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      error: 'Cannot convert Book Value (CAD) into USD cost basis: provide a valid USD/CAD rate or a CAD market value and USD unit price.',
    };
  }

  return { avgCost: bookValueCad / quantity / rate, exchangeRateToCad: rate };
}
