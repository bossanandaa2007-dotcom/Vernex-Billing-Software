'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ReceiptPreview } from '@/components/receipt/ReceiptPreview';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';
import { formatMoney } from '@/lib/currency';
import eventBus from '@/lib/even';
import { ReceiptItem, ReceiptSale, ReceiptShop } from '@/lib/receipt';
import { TransactionData } from '@/types/transaction';
import axios from 'axios';
import {
  Barcode,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileDown,
  History,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { userFacingError } from '@/lib/user-facing-error';

type ProductDetail = {
  sellprice: number;
};

type ProductStock = {
  id: string;
  name: string;
  imageProduct?: string | null;
  price: number;
  stock: number;
  cat: string;
  Product: ProductDetail[];
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
};

type RemovedLine = {
  productId: string;
  quantity: number;
  name: string;
};

type ShopSettings = ReceiptShop & {
  tax?: number | null;
};

const ALL = 'ALL';
const LOW_STOCK_LIMIT = 10;

export function PosBilling() {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const searchRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<TransactionData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shop, setShop] = useState<ShopSettings>({ country: 'India', currency: 'INR', taxMode: 'GST', tax: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('0');
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', taxId: '' });
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<RemovedLine | null>(null);
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'bill' | 'summary' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('transactionId');
    if (stored) setTransactionId(stored);
    searchRef.current?.focus();
  }, []);

  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoadingProducts(true);
    try {
      const response = await axios.get<ProductStock[]>('/api/storage');
      setProducts(response.data);
    } catch {
      toast.error('Unable to refresh products.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchTransactionData = useCallback(async () => {
    if (!transactionId) {
      setTransactionData([]);
      return;
    }
    try {
      const response = await axios.get(`/api/transactions/${transactionId}`);
      setTransactionData(response.data.items ?? []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        localStorage.removeItem('transactionId');
        setTransactionId(null);
        setTransactionData([]);
      } else {
        toast.error('Unable to load the current bill.');
      }
    }
  }, [transactionId]);

  useEffect(() => {
    fetchProducts();
    axios.get('/api/shopdata').then(({ data }) => {
      const nextShop = data.data ?? {};
      setShop(nextShop);
    }).catch(() => {});
    axios.get('/api/customers').then(({ data }) => setCustomers(data)).catch(() => setCustomers([]));
  }, [fetchProducts]);

  useEffect(() => {
    fetchTransactionData();
  }, [fetchTransactionData]);

  useEffect(() => {
    const refresh = () => fetchProducts(true);
    const interval = window.setInterval(() => {
      if (!activeOverlay) refresh();
    }, 30000);
    window.addEventListener('focus', refresh);
    eventBus.on('fetchProductStocks', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      eventBus.removeListener('fetchProductStocks', refresh);
    };
  }, [activeOverlay, fetchProducts]);

  const taxRate = Number(shop.tax ?? 0);
  const taxMode = shop.taxMode ?? 'GST';
  const currency = shop.currency ?? 'INR';
  const country = shop.country ?? 'India';
  const subtotal = useMemo(
    () => transactionData.reduce((sum, item) => sum + item.product.sellprice * item.quantity, 0),
    [transactionData]
  );
  const tax = taxMode === 'NONE' ? 0 : subtotal * (taxRate / 100);
  const discountNumber = Math.min(Math.max(Number(discount) || 0, 0), subtotal + tax);
  const grandTotal = Math.max(0, subtotal + tax - discountNumber);
  const received = Math.max(Number(amountReceived) || 0, 0);
  const change = Math.max(0, received - grandTotal);
  const itemCount = transactionData.reduce((sum, item) => sum + item.quantity, 0);
  const methods = country === 'India' ? ['CASH', 'UPI', 'CARD', 'CREDIT'] : ['CASH', 'CARD', 'ONLINE', 'CREDIT'];

  const categories = useMemo(() => [ALL, ...Array.from(new Set(products.map((item) => item.cat)))], [products]);
  const brands = useMemo(() => [ALL, ...Array.from(new Set(products.map((item) => item.id.split('-')[0] || 'SKU')))], [products]);
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const salePrice = product.Product[0]?.sellprice;
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query) ||
        String(salePrice ?? '').includes(query);
      const matchesCategory = category === ALL || product.cat === category;
      const matchesBrand = brand === ALL || product.id.startsWith(brand);
      return matchesQuery && matchesCategory && matchesBrand;
    });
  }, [brand, category, products, searchTerm]);

  useEffect(() => {
    if (paymentMethod !== 'CREDIT' && grandTotal > 0) {
      setAmountReceived(grandTotal.toFixed(2));
    }
  }, [grandTotal, paymentMethod]);

  const ensureTransaction = async () => {
    if (transactionId) return transactionId;
    const response = await axios.post('/api/transactions');
    const id = response.data.id as string;
    localStorage.setItem('transactionId', id);
    setTransactionId(id);
    return id;
  };

  const addProduct = async (productId: string, quantity = 1) => {
    if (isBlocked) return toast.error(expiredMessage);
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return toast.error('This product is out of stock.');
    setMutating(true);
    try {
      const id = await ensureTransaction();
      await axios.post('/api/onsale', { productId, transactionId: id, qTy: quantity });
      setLastRemoved(null);
      await Promise.all([fetchTransactionData(), fetchProducts(true)]);
      toast.success(`${product.name} added to bill.`);
    } catch (error) {
      toast.error(userFacingError(axios.isAxiosError(error) ? error.response?.data : error, 'Unable to add this product. Please try again.'));
    } finally {
      setMutating(false);
      searchRef.current?.focus();
    }
  };

  const updateQuantity = async (line: TransactionData, quantity: number) => {
    if (quantity < 1) return removeLine(line);
    setMutating(true);
    try {
      await axios.patch(`/api/onsale/${line.id}`, { qTy: quantity });
      await fetchTransactionData();
    } catch (error) {
      toast.error(userFacingError(axios.isAxiosError(error) ? error.response?.data : error, 'Unable to update the quantity. Please try again.'));
    } finally {
      setMutating(false);
    }
  };

  const removeLine = async (line: TransactionData) => {
    setMutating(true);
    try {
      await axios.delete(`/api/onsale/${line.id}`);
      setLastRemoved({
        productId: line.productId,
        quantity: line.quantity,
        name: line.product.productstock.name,
      });
      await fetchTransactionData();
      toast.info('Item removed. Undo is available.');
    } catch {
      toast.error('Unable to remove item.');
    } finally {
      setMutating(false);
    }
  };

  const clearBill = async () => {
    if (!transactionId) return;
    if (!window.confirm('Clear the current bill?')) return;
    setMutating(true);
    try {
      await axios.delete(`/api/transactions/${transactionId}`);
      localStorage.removeItem('transactionId');
      setTransactionId(null);
      setTransactionData([]);
      setLastRemoved(null);
      setActiveOverlay(null);
      toast.success('Bill cleared.');
    } catch {
      toast.error('Unable to clear bill.');
    } finally {
      setMutating(false);
    }
  };

  const checkout = async () => {
    if (!transactionId || !transactionData.length) return;
    if (isBlocked) return toast.error(expiredMessage);
    setCheckoutLoading(true);
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
      setTransactionData([]);
      setActiveOverlay(null);
      await fetchProducts(true);
      toast.success(`Sale completed: ${response.data.billNumber}`);
    } catch (error) {
      toast.error(userFacingError(axios.isAxiosError(error) ? error.response?.data : error, 'Unable to complete the bill. Please try again.'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const match = customers.find((item) => item.id === id);
    setCustomer(match ? {
      name: match.name,
      phone: match.phone,
      email: match.email ?? '',
      address: match.address ?? '',
      taxId: match.taxId ?? '',
    } : { name: '', phone: '', email: '', address: '', taxId: '' });
  };

  const scanOrAddFirst = () => {
    const exact = filteredProducts.find((item) => item.id.toLowerCase() === searchTerm.trim().toLowerCase());
    const candidate = exact ?? filteredProducts[0];
    if (candidate) addProduct(candidate.id);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'F4') {
        event.preventDefault();
        checkout();
      }
      if (event.ctrlKey && event.key === 'Backspace') {
        event.preventDefault();
        clearBill();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="relative w-full pb-24">
      <section className="mx-auto w-full max-w-7xl space-y-4">
        <Card className="overflow-hidden border-vernex-border/80 shadow-sm">
          <CardHeader className="space-y-4 bg-white/80 pb-4 dark:bg-vernex-navy/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageSearch className="h-5 w-5 text-vernex-gold" />
                  Product Selection
                </CardTitle>
                <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">
                  Search, scan, filter, and tap to add.
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchProducts()}
                disabled={loadingProducts}
                aria-label="Refresh products"
                title="Refresh products"
              >
                <RefreshCw className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-vernex-muted" />
              <Input
                ref={searchRef}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') scanOrAddFirst();
                }}
                className="h-11 rounded-xl pl-9 pr-10"
                placeholder="Search product, SKU, price, or scan barcode"
              />
              <Barcode className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-vernex-gold" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item === ALL ? 'All categories' : item}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Brand" /></SelectTrigger>
                <SelectContent>{brands.map((item) => <SelectItem key={item} value={item}>{item === ALL ? 'All brands' : item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="min-h-[520px] overflow-auto p-4">
            {loadingProducts ? <ProductSkeleton /> : filteredProducts.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => {
              const price = product.Product[0]?.sellprice ?? 0;
              const out = product.stock <= 0;
              const low = product.stock > 0 && product.stock <= LOW_STOCK_LIMIT;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={out || mutating}
                  onClick={() => addProduct(product.id)}
                  className="group relative min-h-[170px] rounded-2xl border border-vernex-border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#1E335F] dark:bg-vernex-navy"
                >
                  <div className="flex gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-vernex-surface dark:bg-vernex-dark">
                      {product.imageProduct ? (
                        <Image src={product.imageProduct} alt={product.name} fill className="object-cover" sizes="96px" />
                      ) : (
                        <ShoppingBag className="absolute left-8 top-8 h-8 w-8 text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-bold text-vernex-text dark:text-white">{product.name}</div>
                      <div className="mt-1 text-xs text-vernex-muted dark:text-slate-400">SKU: {product.id}</div>
                      <div className="mt-3 font-black text-vernex-navy dark:text-vernex-gold">{formatMoney(price, currency)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                      <Badge variant={out ? 'destructive' : low ? 'secondary' : 'outline'} className="rounded-full">
                        {out ? 'Out of stock' : low ? 'Low stock' : product.cat}
                      </Badge>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm transition group-hover:bg-emerald-700">
                      <Plus className="h-5 w-5" />
                    </span>
                  </div>
                </button>
              );
            })}
              </div>
            ) : (
              <EmptyState
                icon={<PackageSearch className="h-6 w-6" />}
                title="No products found"
                description="Try another search, category, or barcode value."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <div className="fixed bottom-[calc(72px+0.75rem)] left-3 right-3 z-30 md:bottom-4 md:left-4 md:right-4 lg:left-[calc(280px+1rem)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-2xl border border-vernex-border bg-white p-3 shadow-xl dark:border-[#1E335F] dark:bg-vernex-navy">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Selected Items</p>
              <p className="text-xs text-vernex-muted dark:text-slate-400">
                {itemCount} items - {formatMoney(grandTotal, currency)}
              </p>
            </div>
          </div>
          <Button className="h-11 shrink-0 rounded-xl bg-emerald-600 px-4 hover:bg-emerald-700 sm:px-8" disabled={!transactionData.length} onClick={() => setActiveOverlay('bill')}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeOverlay === 'bill' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] md:p-6">
      <section className="min-w-0 w-full max-w-5xl">
        <Card className="h-full overflow-hidden border-vernex-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 bg-white/80 pb-4 dark:bg-vernex-navy/60">
            <div>
              <CardTitle className="text-base">Current Bill</CardTitle>
              <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">
                {transactionId ? `Draft ${transactionId}` : 'No active bill. Add a product to start.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastRemoved && (
                <Button variant="outline" size="sm" onClick={() => addProduct(lastRemoved.productId, lastRemoved.quantity)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Undo
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => toast.info('Bill is held on this device. Resume by returning to POS.')} disabled={!transactionId}>
                <Clock3 className="mr-2 h-4 w-4" /> Hold Bill
              </Button>
              <Button variant="destructive" size="sm" onClick={clearBill} disabled={!transactionId || mutating}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear Bill
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveOverlay(null)} aria-label="Close current bill">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 z-10 bg-vernex-surface text-left text-xs uppercase text-vernex-muted dark:bg-vernex-dark dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-3 py-3">SKU</th>
                    <th className="px-3 py-3 text-right">Unit Price</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-right">Discount</th>
                    <th className="px-3 py-3 text-right">Tax</th>
                    <th className="px-3 py-3 text-right">Line Total</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactionData.map((line) => {
                    const lineSubtotal = line.product.sellprice * line.quantity;
                    const lineTax = taxMode === 'NONE' ? 0 : lineSubtotal * (taxRate / 100);
                    return (
                      <tr key={line.id} className="border-t border-vernex-border bg-white transition hover:bg-vernex-surface/70 dark:border-[#1E335F] dark:bg-vernex-navy/70 dark:hover:bg-vernex-navy">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-vernex-text dark:text-white">{line.product.productstock.name}</div>
                          <div className="text-xs text-vernex-muted dark:text-slate-400">{line.product.productstock.cat}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-vernex-muted">{line.productId}</td>
                        <td className="px-3 py-3 text-right">{formatMoney(line.product.sellprice, currency)}</td>
                        <td className="px-3 py-3">
                          <div className="mx-auto flex w-32 items-center justify-center rounded-lg border border-vernex-border bg-white dark:border-[#1E335F] dark:bg-vernex-dark">
                            <button className="p-2" onClick={() => updateQuantity(line, line.quantity - 1)} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                            <input
                              className="h-9 w-12 bg-transparent text-center font-semibold outline-none"
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(event) => updateQuantity(line, Number(event.target.value))}
                            />
                            <button className="p-2" onClick={() => updateQuantity(line, line.quantity + 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">{formatMoney(0, currency)}</td>
                        <td className="px-3 py-3 text-right">{formatMoney(lineTax, currency)}</td>
                        <td className="px-3 py-3 text-right font-bold">{formatMoney(lineSubtotal + lineTax, currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line)}
                            aria-label={`Remove ${line.product.productstock.name} from bill`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!transactionData.length && (
              <EmptyState
                icon={<ShoppingCart className="h-6 w-6" />}
                title="Your bill is empty"
                description="Search or scan a product to begin this customer checkout."
              />
            )}
          </CardContent>
          <div className="flex flex-col gap-3 border-t border-vernex-border p-4 dark:border-[#1E335F] sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={() => setActiveOverlay(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-vernex-muted dark:text-slate-400">Grand Total</p>
                <p className="text-2xl font-black text-emerald-600">{formatMoney(grandTotal, currency)}</p>
              </div>
              <Button className="h-11 rounded-xl bg-emerald-600 px-8 hover:bg-emerald-700" disabled={!transactionData.length} onClick={() => setActiveOverlay('summary')}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </section>
        </div>
      )}

      {activeOverlay === 'summary' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] md:p-6">
      <aside className="w-full max-w-2xl space-y-4">
        <Card className="border-vernex-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base">Billing Summary</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setActiveOverlay(null)} aria-label="Close billing summary">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SummaryMetric label="Items" value={String(itemCount)} />
              <SummaryMetric label="Subtotal" value={formatMoney(subtotal, currency)} />
            </div>
            <div className="space-y-2 text-sm">
              <SummaryLine label="Discount" value={formatMoney(discountNumber, currency)} />
              <SummaryLine label={`${taxMode === 'NONE' ? 'Tax' : taxMode} (${taxRate}%)`} value={formatMoney(tax, currency)} />
            </div>
            <Separator />
            <div className="rounded-xl bg-vernex-navy p-4 text-white dark:bg-vernex-gold dark:text-vernex-dark">
              <div className="text-xs uppercase tracking-wide opacity-80">Grand Total</div>
              <div className="mt-1 text-3xl font-black">{formatMoney(grandTotal, currency)}</div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Customer</Label>
                <Select value={customerId || 'walk-in'} onValueChange={(value) => selectCustomer(value === 'walk-in' ? '' : value)}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in customer</SelectItem>
                    {customers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} - {item.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input placeholder="Quick customer name" value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <Input placeholder="Phone" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div><Label>Discount</Label><Input className="mt-1" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
                <div><Label>Payment</Label><Select value={paymentMethod} onValueChange={(value) => {
                  setPaymentMethod(value);
                  setAmountReceived(value === 'CREDIT' ? '0' : grandTotal.toFixed(2));
                }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{methods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div><Label>Amount Received</Label><Input className="mt-1" type="number" min="0" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} /></div>
                <SummaryMetric label="Balance Return" value={formatMoney(change, currency)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Button className="h-11" disabled={!transactionData.length || checkoutLoading || !transactionId || isBlocked} onClick={checkout}>
                {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Complete Payment
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print Receipt</Button>
                <Button variant="outline" onClick={() => window.print()}><FileDown className="mr-2 h-4 w-4" /> Generate PDF</Button>
                <Button variant="outline" onClick={() => toast.success('Draft saved on this device.')}><CreditCard className="mr-2 h-4 w-4" /> Save Draft</Button>
                <Button variant="outline" onClick={() => toast.info('Held bill can be resumed from this device.')}><History className="mr-2 h-4 w-4" /> Hold Bill</Button>
              </div>
              <Button variant="destructive" onClick={clearBill} disabled={!transactionId}>Cancel Bill</Button>
              <Button variant="outline" onClick={() => setActiveOverlay('bill')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
        </div>
      )}
      <ReceiptPreview open={receiptOpen} onOpenChange={setReceiptOpen} sale={receiptSale} items={receiptItems} shop={shop} />
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-vernex-muted dark:text-slate-400">{label}</span><span className="font-semibold">{value}</span></div>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-vernex-border bg-white p-3 dark:border-[#1E335F] dark:bg-vernex-navy">
      <div className="text-xs text-vernex-muted dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[64px_1fr_80px] gap-3 rounded-xl border border-vernex-border bg-white p-3 dark:border-[#1E335F] dark:bg-vernex-navy">
          <div className="h-16 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-3 py-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}
