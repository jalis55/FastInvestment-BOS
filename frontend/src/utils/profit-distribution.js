// A preview of the backend's sequential advisor deductions and per-trade investor allocation.
export function buildProfitDistribution(profits, advisors, investors) {
  const advisorRows = [];
  const investorRows = [];
  for (const profit of profits) {
    let remaining = Number(profit.amount);
    for (const assignment of advisors) {
      const percentage = Number(assignment.com_percentage);
      const amount = remaining * percentage / 100;
      advisorRows.push({
        trade: profit.trade, user: assignment.advisor,
        percentage, amount: Number(amount.toFixed(2)),
      });
      remaining -= amount;
    }
    for (const contribution of investors) {
      const percentage = Number(contribution.contribution_percentage);
      investorRows.push({
        trade: profit.trade, user: contribution.investor,
        contribution: Number(contribution.contribute_amount), percentage,
        amount: Number((remaining * percentage / 100).toFixed(2)),
      });
    }
  }
  return {
    advisorRows, investorRows,
    gross: profits.reduce((sum, profit) => sum + Number(profit.amount), 0),
    advisorTotal: advisorRows.reduce((sum, row) => sum + row.amount, 0),
    investorTotal: investorRows.reduce((sum, row) => sum + row.amount, 0),
    tradeCount: profits.length,
    recipientCount: new Set([...advisorRows, ...investorRows].map((row) => row.user.id)).size,
  };
}
