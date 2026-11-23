# Mobile responsiveness audit

Chrome rendered all 28 application routes at viewport widths of 360, 390, and 768 px using mocked API responses. The initial route views fit the viewport without page-level horizontal overflow. Project Details and Live Share Update were also checked with a sample holding. Other populated states and form interactions were reviewed in source where applicable.

| Priority | Screen | Finding |
| --- | --- | --- |
| High | [Project Details and Live Share Update](src/pages/reports/ProjectDetails.jsx) | The 900 px holdings table had 310 px available at 360 px, 340 px at 390 px, and 438 px at 768 px. Market values, gain or loss, and the Live Share Update totals require sideways scrolling. |
| High | [Trade Details](src/pages/reports/TradeDetails.jsx), [Profit Details](src/pages/reports/ProfitDetails.jsx), and [Disbursement Details](src/pages/reports/DisbursementDetails.jsx) | Populated tables have minimum widths of 860, 680, and 608 px respectively. These widths require sideways scrolling on phones. |
| Medium | [Shared layout](src/pages/layout/Layout.jsx) | At 768 px, the expanded sidebar takes 264 px and horizontal padding takes another 64 px. About 440 px remains for the page, even as several components switch to wider layouts. |

Start with a stacked mobile holdings layout that keeps cost, market value, and gain or loss visible together. Retain the desktop table and use the stacked rows in [Transaction History](src/pages/reports/TransactionHistory.jsx) and [Investment History](src/pages/reports/InvestmentHistory.jsx) as references. Review the sidebar breakpoint next, then apply the mobile table pattern to the other wide reports.
