/* eslint-disable react/no-unescaped-entities */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Cross2Icon, ReloadIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { productSchema } from '@/schema';
import { z } from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Plus, Trash2 } from 'lucide-react';

type VariantForm = {
  name: string;
  price: string;
  sku: string;
};

export function SheetAdd({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [productName, setProductName] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [categoryProduct, setCategories] = useState<string>('');
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantForm[]>([{ name: '', price: '', sku: '' }]);
  const [error, setError] = useState<{ [key: string]: string }>({});
  const buyPriceNumber = parseFloat(buyPrice) || 0;
  const sellPriceNumber = parseFloat(sellPrice) || 0;
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!open) {
      // Reset input value when sheet is closed
      setProductName('');
      setSellPrice('');
      setBuyPrice('');
      setCategories('');
      setHasVariants(false);
      setVariants([{ name: '', price: '', sku: '' }]);
    }
  }, [open]);
  const handleCancel = () => {
    onClose();
    setError({});
  };

  const handleAdd = async () => {
    setLoading(true);
    // Check if the user is online
    const isOnline = navigator.onLine;

    if (!isOnline) {
      toast.error('You are offline. Please check your internet connection.');
      setLoading(false);
      return;
    }

    try {
      const validatedData = productSchema.parse({
        productName: productName,
        buyPrice: buyPriceNumber,
        sellPrice: sellPriceNumber,
        category: categoryProduct,
        hasVariants,
        variants: hasVariants
          ? variants.map((variant) => ({
              name: variant.name,
              price: parseFloat(variant.price) || 0,
              sku: variant.sku,
            }))
          : [],
      });

      // Send validated data using axios
      const response = await axios.post('/api/product', validatedData);

      // If no errors, close the dialog and refresh the page
      onClose();
      router.refresh();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setError((prevError) => ({
          ...prevError,
          ...fieldErrors,
        }));
      } else {
        toast.error('An error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateVariant = (index: number, field: keyof VariantForm, value: string) => {
    setVariants((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, [field]: value } : variant
    )));
    setError((current) => ({ ...current, variants: '' }));
  };

  const addVariant = () => setVariants((current) => [...current, { name: '', price: '', sku: '' }]);

  const removeVariant = (index: number) => {
    setVariants((current) => current.length > 1 ? current.filter((_, variantIndex) => variantIndex !== index) : current);
  };

  return (
    <Sheet open={open}>
      <SheetContent
        showCloseButton={false}
        className="flex w-full max-w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Add product</SheetTitle>
          <SheetDescription>Add your product here.</SheetDescription>
          <div
            onClick={handleCancel}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
          >
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                setError((prevError) => ({ ...prevError, productName: '' }));
              }}
            />
            {error?.productName && (
              <p className="text-sm text-red-500">{error.productName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyPrice">Buy Price</Label>
              <Input
                id="buyPrice"
                value={buyPrice}
                onChange={(e) => {
                  setBuyPrice(e.target.value);
                  setError((prevError) => ({ ...prevError, buyPrice: '' }));
                }}
                type="number"
              />
              {error?.buyPrice && (
                <p className="text-sm text-red-500">{error.buyPrice}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sellPrice">Sell Price</Label>
              <Input
                id="sellPrice"
                value={sellPrice}
                onChange={(e) => {
                  setSellPrice(e.target.value);
                  setError((prevError) => ({ ...prevError, sellPrice: '' }));
                }}
                type="number"
              />
              {error?.sellPrice && (
                <p className="text-sm text-red-500">{error.sellPrice}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryProduct">Category</Label>
            <Input
              id="categoryProduct"
              value={categoryProduct}
              onChange={(e) => {
                setCategories(e.target.value);
                setError((prevError) => ({ ...prevError, category: '' }));
              }}
              placeholder="Type a category (e.g. Snacks)"
            />
            {error?.category && (
              <p className="text-sm text-red-500">{error.category}</p>
            )}
          </div>

          <label
            htmlFor="hasVariants"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-vernex-border px-3 py-2.5 text-sm"
          >
            <span>
              <span className="block font-medium">Has Variants</span>
              <span className="block text-muted-foreground">
                Add size/options like Large, Medium, Regular
              </span>
            </span>
            <input
              id="hasVariants"
              type="checkbox"
              checked={hasVariants}
              onChange={(event) => setHasVariants(event.target.checked)}
              className="h-5 w-5 shrink-0 accent-emerald-600"
            />
          </label>

          {hasVariants && (
            <div className="rounded-xl border border-vernex-border p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-semibold">Variants</p>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="mr-2 h-4 w-4" /> Add Variant
                </Button>
              </div>
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-vernex-surface p-2"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(event) => updateVariant(index, 'name', event.target.value)}
                        className="sm:flex-1"
                      />
                      <Input
                        placeholder="Price"
                        type="number"
                        value={variant.price}
                        onChange={(event) => updateVariant(index, 'price', event.target.value)}
                        className="sm:w-24"
                      />
                      <Input
                        placeholder="SKU optional"
                        value={variant.sku}
                        onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                        className="sm:flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                        disabled={variants.length === 1}
                        className="self-end sm:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {error?.variants && <div className="mt-2 text-sm text-red-500">{error.variants}</div>}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button
            onClick={handleAdd}
            type="submit"
            disabled={loading}
            className="text-gray-100"
          >
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              'Add Product'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
