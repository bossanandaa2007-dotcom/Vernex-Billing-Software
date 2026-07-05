import axios from 'axios';

export type DashboardPeriod = 'today' | 'week' | 'month';

export async function getTotal(period: DashboardPeriod = 'today') {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
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
    } catch (error) {
      lastError = error;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (attempt === 2 || (status !== undefined && status < 500)) throw error;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
    }
  }
  throw lastError;
}
