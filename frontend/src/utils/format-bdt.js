const currency = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'code',
});

export const bdtCents = (decimalAmount) => BigInt(decimalAmount.replace('.', ''));

export function formatBdtCents(cents) {
  const absolute = cents < 0n ? -cents : cents;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return (cents < 0n ? '−' : '') + currency.formatToParts(absolute / 100n)
    .map((part) => part.type === 'fraction' ? fraction : part.value)
    .join('');
}
