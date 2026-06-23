import axios from 'axios';

export async function getTotal() {
  const { data } = await axios.get('/api/dashboard');
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
  };
}
