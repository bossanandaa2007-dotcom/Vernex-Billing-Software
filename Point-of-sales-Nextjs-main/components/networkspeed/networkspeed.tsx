'use client';
import React from 'react';
import { CircleCheck } from 'lucide-react';

function NetworkSpeed() {
  return (
    <div className="flex flex-1 justify-center items-center w-full h-full min-h-[6rem] rounded-xl border border-vernex-border bg-vernex-surface dark:border-[#1E335F] dark:bg-vernex-dark">
      <div
        className="flex items-center text-vernex-success"
      >
        <CircleCheck className="mr-3 h-9 w-9" />
        <div>
          <p className="text-xl font-bold">Operational</p>
          <p className="text-sm text-vernex-muted dark:text-slate-400">Database and billing routes ready</p>
        </div>
      </div>
    </div>
  );
}

export default NetworkSpeed;
