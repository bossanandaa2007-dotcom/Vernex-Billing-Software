'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBillNumber } from '@/lib/bill-number';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type Values = { billPrefix: string; billPadding: number; billNextNumber: number; showBusinessLogo: boolean; showTaxId: boolean; showCustomerDetails: boolean; showItemTax: boolean; showFooter: boolean };
export default function BillingSettings(props: Values) {
  const [values, setValues] = useState(props);
  useEffect(() => setValues({ billPrefix: props.billPrefix, billPadding: props.billPadding, billNextNumber: props.billNextNumber, showBusinessLogo: props.showBusinessLogo, showTaxId: props.showTaxId, showCustomerDetails: props.showCustomerDetails, showItemTax: props.showItemTax, showFooter: props.showFooter }), [props.billPrefix, props.billPadding, props.billNextNumber, props.showBusinessLogo, props.showTaxId, props.showCustomerDetails, props.showItemTax, props.showFooter]);
  const save = async () => { try { await axios.post('/api/shopdata', values); toast.success('Billing and receipt settings saved.'); } catch { toast.error('Unable to save billing settings.'); } };
  const toggles: Array<[keyof Values, string]> = [['showBusinessLogo','Show Vernex branding'],['showTaxId','Show business tax ID'],['showCustomerDetails','Show customer details'],['showItemTax','Show item tax'],['showFooter','Show footer']];
  return <Card><CardHeader><CardTitle>Bill Number & Receipt Display</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><div><Label>Bill Prefix</Label><Input value={values.billPrefix} onChange={(e) => setValues((v) => ({ ...v, billPrefix: e.target.value.toUpperCase() }))} /></div><div><Label>Padding</Label><Input type="number" min="1" max="10" value={values.billPadding} onChange={(e) => setValues((v) => ({ ...v, billPadding: Number(e.target.value) }))} /></div><div><Label>Next Number</Label><Input type="number" min="1" value={values.billNextNumber} onChange={(e) => setValues((v) => ({ ...v, billNextNumber: Number(e.target.value) }))} /></div></div><div className="rounded-md bg-vernex-surface p-3 dark:bg-vernex-dark">Preview: <b>{formatBillNumber(values.billNextNumber, values.billPrefix, values.billPadding)}</b></div><div className="grid gap-3 sm:grid-cols-2">{toggles.map(([key,label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(values[key])} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))} />{label}</label>)}</div><Button onClick={save}>Save Billing Settings</Button></CardContent></Card>;
}
