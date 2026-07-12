'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import eventBus from '@/lib/even';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import NextImage from 'next/image';

type Values = { phone: string; address: string; taxId: string; receiptFooter: string; receiptLogo: string };
const MAX_LOGO_BYTES = 120 * 1024;
const MAX_LOGO_DIMENSION = 512;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function ReceiptSettings(props: Values) {
  const [values, setValues] = useState(props);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues({
    phone: props.phone,
    address: props.address,
    taxId: props.taxId,
    receiptFooter: props.receiptFooter,
    receiptLogo: props.receiptLogo,
  }), [props.phone, props.address, props.taxId, props.receiptFooter, props.receiptLogo]);
  const field = (key: keyof Values, label: string) => <div><Label>{label}</Label><Input value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></div>;
  const updateLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return toast.error('Logo must be PNG, JPG, or WebP.');
    if (file.size > MAX_LOGO_BYTES) return toast.error('Logo must be 120KB or smaller.');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = reject;
      image.src = dataUrl;
    });
    if (dimensions.width > MAX_LOGO_DIMENSION || dimensions.height > MAX_LOGO_DIMENSION) {
      return toast.error('Logo dimensions must be 512 x 512 px or smaller.');
    }
    setValues((current) => ({ ...current, receiptLogo: dataUrl }));
  };
  const save = async () => {
    setSaving(true);
    try { await axios.post('/api/shopdata', values); eventBus.emit('fetchStoreData'); toast.success('Changes saved successfully.'); }
    catch { toast.error('Unable to save changes. Please try again.'); }
    finally { setSaving(false); }
  };
  return <Card>
    <CardHeader><CardTitle>Receipt Details</CardTitle><CardDescription>Business information printed on receipts.</CardDescription></CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Receipt Logo</Label>
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-vernex-border p-3 dark:border-[#1E335F] sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-vernex-surface dark:bg-vernex-dark">
            {values.receiptLogo ? <NextImage src={values.receiptLogo} alt="Receipt logo preview" width={80} height={80} unoptimized className="h-full w-full object-contain" /> : <ImagePlus className="h-7 w-7 text-vernex-muted" />}
          </div>
          <div className="flex-1 text-sm text-vernex-muted dark:text-slate-300">
            <p>PNG, JPG, or WebP. Max 120KB. Max 512 x 512 px.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input type="file" accept="image/png,image/jpeg,image/webp" className="max-w-sm" onChange={(event) => updateLogo(event.target.files?.[0])} />
              {values.receiptLogo && <Button type="button" variant="outline" onClick={() => setValues((current) => ({ ...current, receiptLogo: '' }))}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>}
            </div>
          </div>
        </div>
      </div>
      {field('phone', 'Business Phone')}{field('taxId', 'GSTIN / Tax ID')}{field('address', 'Business Address')}{field('receiptFooter', 'Receipt Footer')}
    </CardContent>
    <CardFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Saving...' : 'Save Changes'}</Button></CardFooter>
  </Card>;
}
