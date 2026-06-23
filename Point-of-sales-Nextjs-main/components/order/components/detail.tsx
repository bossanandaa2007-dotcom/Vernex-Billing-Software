'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatMoney } from '@/lib/currency';
import eventBus from '@/lib/even';
import { TransactionData } from '@/types/transaction';
import axios from 'axios';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ReceiptPreview } from '@/components/receipt/ReceiptPreview';
import { ReceiptItem, ReceiptSale, ReceiptShop } from '@/lib/receipt';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';

interface DetailProps {
  data: TransactionData[];
  transactionId: string | null;
  setTransactionId: (id: string | null) => void;
}

export default function Detail({ data, transactionId, setTransactionId }: DetailProps) {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const [taxRate, setTaxRate] = useState(0);
  const [taxMode, setTaxMode] = useState('GST');
  const [currency, setCurrency] = useState('INR');
  const [country, setCountry] = useState('India');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('0');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', taxId: '' });
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string; email?: string; address?: string; taxId?: string }>>([]);
  const [shop, setShop] = useState<ReceiptShop>({ country: 'India', currency: 'INR', taxMode: 'GST' });
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    axios.get('/api/shopdata').then(({ data: response }) => {
      const shop = response.data;
      setTaxRate(shop?.tax ?? 0);
      setTaxMode(shop?.taxMode ?? 'GST');
      setCurrency(shop?.currency ?? 'INR');
      setCountry(shop?.country ?? 'India');
      setShop(shop ?? {});
    }).catch(() => {});
  }, []);

  useEffect(() => { axios.get('/api/customers').then(({ data }) => setCustomers(data)).catch(() => setCustomers([])); }, []);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const match = customers.find((item) => item.id === id);
    setCustomer(match ? { name: match.name, phone: match.phone, email: match.email ?? '', address: match.address ?? '', taxId: match.taxId ?? '' } : { name: '', phone: '', email: '', address: '', taxId: '' });
  };

  const subtotal = useMemo(() => data.reduce((sum, item) => sum + item.product.sellprice * item.quantity, 0), [data]);
  const tax = taxMode === 'NONE' ? 0 : subtotal * (taxRate / 100);
  const discountNumber = Math.min(Math.max(Number(discount) || 0, 0), subtotal + tax);
  const grandTotal = Math.max(0, subtotal + tax - discountNumber);
  const received = Math.max(Number(amountReceived) || 0, 0);
  const change = Math.max(0, received - grandTotal);
  const methods = country === 'India' ? ['CASH', 'UPI', 'CARD', 'CREDIT'] : ['CASH', 'CARD', 'ONLINE', 'CREDIT'];
  const paymentStatus = received >= grandTotal ? 'PAID' : received > 0 ? 'PARTIAL' : 'PENDING';

  useEffect(() => {
    if (paymentMethod !== 'CREDIT' && Number(amountReceived) === 0 && grandTotal > 0) {
      setAmountReceived(grandTotal.toFixed(2));
    }
  }, [grandTotal, paymentMethod, amountReceived]);

  const selectMethod = (method: string) => {
    setPaymentMethod(method);
    setAmountReceived(method === 'CREDIT' ? '0' : grandTotal.toFixed(2));
  };

  const checkout = async () => {
    if (!transactionId) return;
    if (isBlocked) {
      toast.error(expiredMessage);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.patch(`/api/transactions/${transactionId}`, {
        discount: discountNumber,
        paymentMethod,
        amountReceived: received,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerAddress: customer.address,
        customerTaxId: customer.taxId,
        customerId,
      });
      setReceiptSale(response.data);
      setReceiptItems(response.data.products ?? []);
      setReceiptOpen(true);
      localStorage.removeItem('transactionId');
      setTransactionId(null);
      eventBus.emit('clearTransactionData');
      toast.success(`Sale completed: ${response.data.billNumber}`);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : null;
      toast.error(typeof message === 'string' ? message : 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  const customerField = (key: keyof typeof customer, label: string, type = 'text') => (
    <div><Label>{label}</Label><Input type={type} value={customer[key]} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} /></div>
  );

  return (
    <>
    <Card>
      <CardHeader><CardTitle>Payment Summary</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
          <div className="flex justify-between"><span>{taxMode === 'NONE' ? 'Tax' : taxMode} ({taxRate}%)</span><span>{formatMoney(tax, currency)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{formatMoney(discountNumber, currency)}</span></div>
          <Separator />
          <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span>{formatMoney(grandTotal, currency)}</span></div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Customer Details <span className="font-normal text-vernex-muted">(optional)</span></h3>
          <div className="mb-4"><Label>Existing Customer</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={customerId} onChange={(event) => selectCustomer(event.target.value)}><option value="">Quick customer / walk-in</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.phone}</option>)}</select></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customerField('name', 'Customer Name')}{customerField('phone', 'Phone')}{customerField('email', 'Email', 'email')}{customerField('address', 'Address')}{customerField('taxId', country === 'India' ? 'GSTIN' : 'Tax ID')}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label>Discount</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={selectMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Amount Received</Label><Input type="number" min="0" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} /></div>
        </div>
        <div className="grid gap-2 rounded-lg bg-vernex-surface p-4 text-sm dark:bg-vernex-dark sm:grid-cols-2">
          <div>Payment Status: <strong>{paymentMethod === 'CREDIT' ? paymentStatus : received >= grandTotal ? 'PAID' : 'PENDING'}</strong></div>
          <div>Change: <strong>{formatMoney(change, currency)}</strong></div>
        </div>
        <Button className="w-full" disabled={!data.length || loading || !transactionId || isBlocked} onClick={checkout}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Complete Sale
        </Button>
      </CardContent>
    </Card>
    <ReceiptPreview open={receiptOpen} onOpenChange={setReceiptOpen} sale={receiptSale} items={receiptItems} shop={shop} />
    </>
  );
}
