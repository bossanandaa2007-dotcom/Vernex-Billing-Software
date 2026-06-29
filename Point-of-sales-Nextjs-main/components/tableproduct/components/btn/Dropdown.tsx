"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DeleteAlertDialog } from "./alertDelete";
import { SheetEdit } from "./sheetEdit";
import { CatProduct } from "@prisma/client";
import { SheetRestock } from './sheetRestock';

type Product = {
  id: string;
  sellprice: number;
  productstock: {
    id: string;
    name: string;
    cat: CatProduct;
    stock: number;
    price: number;
  };
};

const Dropdown = ({ product }: { product: Product }) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);

  const handleDeleteClose = () => {
    setDeleteOpen(false);
  };

  const handleEditClose = () => {
    setEditOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRestockOpen(true)}>Restock</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteAlertDialog
        open={deleteOpen}
        onClose={handleDeleteClose}
        data={product}
      />
      <SheetEdit open={editOpen} onClose={handleEditClose} data={product} />
      <SheetRestock open={restockOpen} onClose={() => setRestockOpen(false)} product={product.productstock} />
    </>
  );
};

export default Dropdown;
