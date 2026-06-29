'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import ShopnameCard from './components/shopname';
import TaxrateCard from './components/taxrate';
import eventBus from '@/lib/even';
import RegionalSettings from './components/regional';
import ReceiptSettings from './components/receipt';
import BillingSettings from './components/billing';
export function Setting() {
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState('INR');
  const [taxMode, setTaxMode] = useState('GST');
  const [receiptDetails, setReceiptDetails] = useState({ phone: '', address: '', taxId: '', receiptFooter: 'Thank you for your business!' });
  const [billing, setBilling] = useState({ billPrefix: 'VNX', billPadding: 6, billNextNumber: 1, showBusinessLogo: true, showTaxId: true, showCustomerDetails: true, showItemTax: true, showFooter: true });

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const isOnline = navigator.onLine;

        if (!isOnline) {
          toast.error(
            'You are offline. Please check your internet connection.'
          );
          return;
        }

        const response = await axios.get('/api/shopdata');
        const shopdata = response.data?.data;

        if (response.status === 200) {
          setStoreId(shopdata?.id ?? null);
          setStoreName(shopdata?.name || 'Vernex Demo Shop');
          setTaxRate(shopdata?.tax ?? 0);
          setCountry(shopdata?.country ?? 'India');
          setCurrency(shopdata?.currency ?? 'INR');
          setTaxMode(shopdata?.taxMode ?? 'GST');
          setReceiptDetails({
            phone: shopdata?.phone ?? '',
            address: shopdata?.address ?? '',
            taxId: shopdata?.taxId ?? '',
            receiptFooter: shopdata?.receiptFooter ?? 'Thank you for your business!',
          });
          setBilling({ billPrefix: shopdata?.billPrefix ?? 'VNX', billPadding: shopdata?.billPadding ?? 6, billNextNumber: shopdata?.billNextNumber ?? 1, showBusinessLogo: shopdata?.showBusinessLogo ?? true, showTaxId: shopdata?.showTaxId ?? true, showCustomerDetails: shopdata?.showCustomerDetails ?? true, showItemTax: shopdata?.showItemTax ?? true, showFooter: shopdata?.showFooter ?? true });
        } else {
          toast.error('Failed to fetch data: ' + shopdata.error);
        }
      } catch (error: any) {
        toast.error(
          'Failed to fetch data: ' +
            (error.response?.data.error || error.message)
        );
      }
    };

    fetchShopData();

    const handleEventBusEvent = () => {
      fetchShopData();
    };

    eventBus.on('fetchStoreData', handleEventBusEvent);

    // Clean up event listener
    return () => {
      eventBus.removeListener('fetchStoreData', handleEventBusEvent);
    };
  }, []);

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 ">
          <div className="grid gap-6">
            <ShopnameCard storeName={storeName} storeId={storeId} />
            <TaxrateCard tax={taxRate} storeId={storeId} />
            <RegionalSettings country={country} currency={currency} taxMode={taxMode} />
            <ReceiptSettings {...receiptDetails} />
            <BillingSettings {...billing} />
          </div>
        </div>
      </div>
    </div>
  );
}
