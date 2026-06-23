'use client';
import React from 'react';
import { ReceiptText } from 'lucide-react';

function WeatherComponent(): React.ReactNode {
  return (
    <div className="flex flex-1 justify-center items-center w-full h-full min-h-[6rem] rounded-xl border border-vernex-border bg-vernex-surface dark:border-[#1E335F] dark:bg-vernex-dark">
      <div className="flex flex-col items-center text-vernex-navy dark:text-white">
        <div className="text-2xl font-bold">Billing Ready</div>
        <div className="text-sm text-vernex-muted dark:text-slate-400">Start a new POS transaction</div>
        <div className="flex items-center mt-2">
          <ReceiptText className="w-9 h-9 text-vernex-gold" />
        </div>
      </div>
    </div>
  );
}

export default WeatherComponent;
