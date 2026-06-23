'use client';

import { formatMoney } from '@/lib/currency';
import { getTotal } from '@/data/stock';
import { AlertTriangle, CreditCard, IndianRupee, ReceiptText, RotateCcw, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const empty = {
  totalProducts: 0,
  lowStockItems: 0,
  todayBills: 0,
  todayRevenue: 0,
  netRevenueToday: 0,
  cashSales: 0,
  upiSales: 0,
  cardSales: 0,
  creditSales: 0,
  onlineSales: 0,
  pendingCredit: 0,
  returnsToday: 0,
  refundTotalToday: 0,
  topSellingProduct: 'No sales yet',
  activeCustomers: 0,
  itemsSold: 0,
  currency: 'INR',
};

export default function DashboardCard() {
  const [data, setData] = useState(empty);
  useEffect(() => {
    getTotal().then(setData).catch(() => setData(empty));
  }, []);

  const metrics = [
    { label: 'Net Revenue Today', value: formatMoney(data.netRevenueToday, data.currency), icon: IndianRupee },
    { label: 'Today Bills', value: data.todayBills, icon: ReceiptText },
    { label: 'Cash / UPI / Card', value: `${formatMoney(data.cashSales, data.currency)} / ${formatMoney(data.upiSales, data.currency)} / ${formatMoney(data.cardSales, data.currency)}`, icon: CreditCard },
    { label: 'Credit Pending', value: formatMoney(data.pendingCredit, data.currency), icon: CreditCard },
    { label: 'Returns Today', value: `${data.returnsToday} (${formatMoney(data.refundTotalToday, data.currency)})`, icon: RotateCcw },
    { label: 'Low Stock Items', value: data.lowStockItems, icon: AlertTriangle },
    { label: 'Top Selling Product', value: data.topSellingProduct, icon: Trophy },
    { label: 'Active Customers', value: data.activeCustomers, icon: Users },
  ];

  return (
    <div className="grid h-full w-full grid-cols-2 gap-3">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex flex-col items-center justify-center rounded-xl border border-vernex-border bg-vernex-surface p-3 dark:border-[#1E335F] dark:bg-vernex-dark">
          <Icon className="h-7 w-7 text-vernex-gold" />
          <p className="mt-2 text-center text-xs font-semibold text-vernex-muted">{label}</p>
          <p className="mt-2 text-sm font-bold text-vernex-navy dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
