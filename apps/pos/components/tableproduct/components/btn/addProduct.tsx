'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SheetAdd } from './sheetAdd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';

// AddButtonComponent to render a button for adding a new item
function AddButtonComponent(): React.ReactNode {
  const [addOpen, setAddOpen] = useState(false);
  const { isBlocked, expiredMessage } = useSubscriptionStatus();

  // Close the add sheet
  const handleAddClose = () => {
    setAddOpen(false);
  };

  // Open the add sheet
  const handleAddClick = () => {
    if (isBlocked) {
      alert(expiredMessage);
      return;
    }
    setAddOpen(true);
  };

  return (
    <>
      {/* Button for adding a new item */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={handleAddClick} disabled={isBlocked}>
              Add Product
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Product</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {/* SheetAdd component to add a new item */}
      <SheetAdd open={addOpen} onClose={handleAddClose} />
    </>
  );
}

export default AddButtonComponent;
