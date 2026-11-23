const quoteEndpoint = 'https://stockchartbd.com/api/v1.php';

export async function fetchStockChartQuotes(holdings) {
    const symbols = new Set(
        holdings.map(({ instrument }) => instrument?.name?.trim().toUpperCase()).filter(Boolean),
    );

    const quotes = await Promise.allSettled([...symbols].map(async (symbol) => {
        const params = new URLSearchParams({ endpoint: 'quote', symbol });
        const response = await fetch(`${quoteEndpoint}?${params}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('Quote request failed.');

        const { ok, quote } = await response.json();
        const price = Number(quote?.close);
        if (!ok || !Number.isFinite(price) || price <= 0) throw new Error('Closing quote unavailable.');

        return [symbol, { price, date: quote.date }];
    }));

    return Object.fromEntries(
        quotes.filter((result) => result.status === 'fulfilled').map((result) => result.value),
    );
}
