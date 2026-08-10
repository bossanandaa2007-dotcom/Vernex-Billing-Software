'use client';

import { useEffect } from 'react';

export function ModalLockCleanup() {
  useEffect(() => {
    const cleanup = () => {
      const hasOpenModal = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
      if (hasOpenModal) return;
      if (document.body.style.pointerEvents === 'none') document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-scroll-locked');
    };

    const observer = new MutationObserver(() => window.setTimeout(cleanup, 50));
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });
    document.addEventListener('pointerdown', cleanup, true);
    document.addEventListener('keydown', cleanup, true);
    window.addEventListener('focus', cleanup);
    cleanup();

    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', cleanup, true);
      document.removeEventListener('keydown', cleanup, true);
      window.removeEventListener('focus', cleanup);
    };
  }, []);

  return null;
}
