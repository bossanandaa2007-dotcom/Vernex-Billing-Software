'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import eventBus from '@/lib/even';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

export default function RegionalSettings({ country, currency, taxMode }: { country: string; currency: string; taxMode: string }) {
  const [values, setValues] = useState({ country, currency, taxMode });
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues({ country, currency, taxMode }), [country, currency, taxMode]);
  const currencies = values.country === 'India' ? ['INR'] : ['USD', 'EUR', 'GBP', 'AED'];
  const taxModes = values.country === 'India' ? ['GST', 'NONE'] : ['VAT', 'SALES_TAX', 'TAX', 'NONE'];

  const save = async () => {
    setSaving(true);
    try {
      await axios.post('/api/shopdata', values);
      eventBus.emit('fetchStoreData');
      toast.success('Changes saved successfully.');
    } catch { toast.error('Unable to save changes. Please try again.'); }
    finally { setSaving(false); }
  };

  return <Card>
    <CardHeader><CardTitle>Country & Currency</CardTitle><CardDescription>Basic regional billing preferences.</CardDescription></CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-3">
      <div><Label>Country</Label><Select value={values.country} onValueChange={(country) => setValues({ country, currency: country === 'India' ? 'INR' : 'USD', taxMode: country === 'India' ? 'GST' : 'VAT' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="India">India</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
      <div><Label>Currency</Label><Select value={values.currency} onValueChange={(currency) => setValues((current) => ({ ...current, currency }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencies.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Tax Mode</Label><Select value={values.taxMode} onValueChange={(taxMode) => setValues((current) => ({ ...current, taxMode }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{taxModes.map((item) => <SelectItem key={item} value={item}>{item.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
    </CardContent>
    <CardFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Saving...' : 'Save Changes'}</Button></CardFooter>
  </Card>;
}
