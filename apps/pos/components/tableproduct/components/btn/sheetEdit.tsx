/* eslint-disable react/no-unescaped-entities */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
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
type Data = {
  id: string;
  sellprice: number;
  productstock: {
    id: string;
    name: string;
    cat: string;
    stock: number;
    price: number;
  };
};

export function SheetEdit({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: Data;
}) {
  const [productName, setProductName] = useState(data.productstock.name || '');
  const [categoryProduct, setCategories] = useState<string>(
    data.productstock.cat ?? ''
  );
  const [sellPrice, setSellPrice] = useState(data.sellprice || '');
  const [buyPrice, setBuyPrice] = useState(data.productstock.price || '');
  const [error, setError] = useState<{ [key: string]: string }>({});

  const buyPriceNumber = parseFloat(String(buyPrice)) || 0;
  const sellPriceNumber = parseFloat(String(sellPrice)) || 0;

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      // Reset input value when sheet is closed
      setProductName(data.productstock.name || '');
      setSellPrice(data.sellprice || '');
      setBuyPrice(data.productstock.price || '');
      setCategories(data.productstock.cat ?? '');
    }
  }, [
    open,
    data.productstock.name,
    data.sellprice,
    data.productstock.cat,
    data.productstock.price,
  ]);

  const handleCancel = () => {
    onClose();
    setError({});
  };

  const handleEdit = async () => {
    setLoading(true);

    // Check if the user is online
    const isOnline = navigator.onLine;

    if (!isOnline) {
      toast.error('You are offline. Please check your internet connection.');
      setLoading(false);
      return;
    }

    // Check if any changes were made
    if (
      productName === data.productstock.name &&
      buyPriceNumber === data.productstock.price &&
      sellPriceNumber === data.sellprice &&
      categoryProduct === data.productstock.cat
    ) {
      toast.info('No changes made.');
      setLoading(false);
      onClose();
      return;
    }

    try {
      const validatedData = productSchema.parse({
        productName: productName,
        buyPrice: buyPriceNumber,
        sellPrice: sellPriceNumber,
        category: categoryProduct,
      });

      // Send validated data using axios
      await axios.patch(`/api/product/${data.productstock.id}`, validatedData);
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
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open}>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Edit product</SheetTitle>
          <SheetDescription>
            Make changes to your product here. Click save when you're done.
          </SheetDescription>
          <div
            onClick={handleCancel}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
          >
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </div>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-4 sm:gap-4">
            <Label htmlFor="productName" className="text-right">
              Product Name
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                setError((prevError) => ({ ...prevError, productName: '' }));
              }}
              className="col-span-3"
            />
            {error?.productName && (
              <div className="col-start-2 col-span-3 text-red-500">
                {error.productName}
              </div>
            )}
            <Label htmlFor="buyPrice" className="text-right">
              Buy Price
            </Label>
            <Input
              id="buyPrice"
              value={buyPrice}
              onChange={(e) => {
                setBuyPrice(e.target.value);
                setError((prevError) => ({ ...prevError, buyPrice: '' }));
              }}
              className="col-span-3"
              type="number"
            />
            {error?.buyPrice && (
              <div className="col-start-2 col-span-3 text-red-500">
                {error.buyPrice}
              </div>
            )}
            <Label htmlFor="sellPrice" className="text-right">
              Sell Price
            </Label>
            <Input
              id="sellPrice"
              value={sellPrice}
              onChange={(e) => {
                setSellPrice(e.target.value);
                setError((prevError) => ({ ...prevError, sellPrice: '' }));
              }}
              className="col-span-3"
              type="number"
            />
            {error?.sellPrice && (
              <div className="col-start-2 col-span-3 text-red-500">
                {error.sellPrice}
              </div>
            )}
            <Label htmlFor="categoryProduct" className="text-right">
              Category
            </Label>
            <Input
              id="categoryProduct"
              value={categoryProduct}
              onChange={(e) => {
                setCategories(e.target.value);
                setError((prevError) => ({ ...prevError, category: '' }));
              }}
              className="col-span-3"
              placeholder="Type a category (e.g. Snacks)"
            />
            {error?.category && (
              <div className="col-start-2 col-span-3 text-red-500">
                {error.category}
              </div>
            )}
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button
              onClick={handleEdit}
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
                'Save change'
              )}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
