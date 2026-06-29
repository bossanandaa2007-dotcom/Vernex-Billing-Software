import axios from 'axios';

export type DashboardPeriod = 'today' | 'week' | 'month';

export async function getTotal(period: DashboardPeriod = 'today') {
  const { data } = await axios.get('/api/dashboard', { params: { period } });
  return data as {
    totalProducts: number;
    lowStockItems: number;
    todayBills: number;
    todayRevenue: number;
    netRevenueToday: number;
    cashSales: number;
    upiSales: number;
    cardSales: number;
    creditSales: number;
    onlineSales: number;
    pendingCredit: number;
    returnsToday: number;
    refundTotalToday: number;
    topSellingProduct: string;
    activeCustomers: number;
    itemsSold: number;
    currency: string;
    period: DashboardPeriod;
  };
}
