'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import eventBus from '@/lib/even';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

type Values = { phone: string; address: string; taxId: string; receiptFooter: string };

export default function ReceiptSettings(props: Values) {
  const [values, setValues] = useState(props);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues({
    phone: props.phone,
    address: props.address,
    taxId: props.taxId,
    receiptFooter: props.receiptFooter,
  }), [props.phone, props.address, props.taxId, props.receiptFooter]);
  const field = (key: keyof Values, label: string) => <div><Label>{label}</Label><Input value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></div>;
  const save = async () => {
    setSaving(true);
    try { await axios.post('/api/shopdata', values); eventBus.emit('fetchStoreData'); toast.success('Changes saved successfully.'); }
    catch { toast.error('Unable to save changes. Please try again.'); }
    finally { setSaving(false); }
  };
  return <Card>
    <CardHeader><CardTitle>Receipt Details</CardTitle><CardDescription>Business information printed on receipts.</CardDescription></CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-2">{field('phone', 'Business Phone')}{field('taxId', 'GSTIN / Tax ID')}{field('address', 'Business Address')}{field('receiptFooter', 'Receipt Footer')}</CardContent>
    <CardFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Saving...' : 'Save Changes'}</Button></CardFooter>
  </Card>;
}
