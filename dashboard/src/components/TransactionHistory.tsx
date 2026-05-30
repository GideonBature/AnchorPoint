import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const TRANSACTIONS = [
  { type: 'Deposit', asset: 'USDC', amount: '500.00', status: 'Completed', date: '2024-03-15' },
  { type: 'Withdrawal', asset: 'USDC', amount: '120.50', status: 'Pending', date: '2024-03-16' },
  { type: 'Deposit', asset: 'USDC', amount: '1,000.00', status: 'Processing', date: '2024-03-16' },
] as const;

const STATUS_CLASSES = {
  Completed: 'bg-emerald-500/10 text-emerald-400',
  Pending: 'bg-amber-500/10 text-amber-400',
  Processing: 'bg-blue-500/10 text-blue-400',
} as const;

export const TransactionHistory = () => (
  <div className="glass-card overflow-x-auto">
    <table className="w-full text-left" aria-label="Transaction history">
      <caption className="sr-only">
        Transaction history showing type, asset, amount, status, and date for recent transactions
      </caption>
      <thead>
        <tr className="border-b border-slate-800 text-sm text-slate-400">
          <th scope="col" className="p-4 font-medium">Type</th>
          <th scope="col" className="p-4 font-medium">Asset</th>
          <th scope="col" className="p-4 font-medium">Amount</th>
          <th scope="col" className="p-4 font-medium">Status</th>
          <th scope="col" className="p-4 font-medium">Date</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {TRANSACTIONS.map((tx) => (
          <tr
            key={`${tx.type}-${tx.amount}-${tx.date}`}
            className="transition-colors hover:bg-slate-900/50"
          >
            <td className="flex items-center gap-2 p-4">
              {tx.type === 'Deposit' ? (
                <ArrowDownLeft size={16} className="text-emerald-400" aria-hidden="true" />
              ) : (
                <ArrowUpRight size={16} className="text-rose-400" aria-hidden="true" />
              )}
              {tx.type}
            </td>
            <td className="p-4">{tx.asset}</td>
            <td className="p-4 font-mono">${tx.amount}</td>
            <td className="p-4">
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[tx.status]}`}
              >
                {tx.status}
              </span>
            </td>
            <td className="p-4 text-sm text-slate-400">
              <time dateTime={tx.date}>{tx.date}</time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TransactionHistory;
