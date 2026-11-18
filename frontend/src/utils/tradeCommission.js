const MINIMUM_COMMISSION = 10;

export function calculateTradeCommission(tradeValue, commissionRate) {
    if (tradeValue <= 0) return 0;

    const tradeValueInCents = Math.round(tradeValue * 100);
    // The API stores the rate as a percentage with up to four decimal places.
    const rateUnits = Math.round(Number(commissionRate) * 10_000);
    const commissionInCents = Math.round(tradeValueInCents * rateUnits / 1_000_000);
    return Math.max(MINIMUM_COMMISSION, commissionInCents / 100);
}

export function describeTradeCommission(commissionRate) {
    return `${Number(commissionRate)}% of trade value, with a minimum of ${MINIMUM_COMMISSION.toFixed(2)} BDT.`;
}
