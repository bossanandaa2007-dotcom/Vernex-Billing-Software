'use client'; // Use client-side rendering

import { useEffect, useRef, useState } from 'react'; // Import necessary hooks from React
import { useRouter } from 'next/navigation'; // Import the useRouter hook from Next.js for routing
import { useDebounce } from 'use-debounce'; // Import the useDebounce hook for debouncing
import { usePathname, useSearchParams } from 'next/navigation'; // Import the usePathname hook from Next.js for getting the current pathname
import { Input } from '@/components/ui/input'; // Import the Input component
import { Search } from 'lucide-react'; // Import the Search icon component from Lucide React

export function SearchInput({ search }: { search?: string }) {
  const router = useRouter(); // Get the router object
  const path = usePathname(); // Get the current pathname using the usePathname hook
  const searchParams = useSearchParams();
  const initialRender = useRef(true); // Use a ref to track the initial render
  const pathname = path; // Set the pathname variable to the current pathname
  const [text, setText] = useState(search); // Use state to manage the search text
  const [query] = useDebounce(text, 750); // Use the useDebounce hook to debounce the search text

  useEffect(() => {
    if (!initialRender.current) {
      // Check if it's not the initial render
      if (!query && !search) {
        // If the query and search are both empty, return
        return;
      }

      if (!query) {
        // If the query is empty, navigate to the current pathname
        const params = new URLSearchParams(searchParams);
        params.delete('search');
        params.set('page', '1');
        const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.push(url);
      } else {
        // If the query is not empty, navigate to the current pathname with the search query
        const params = new URLSearchParams(searchParams);
        params.set('search', query);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
      }
    } else {
      // If it's the initial render, set initialRender to false
      initialRender.current = false;
    }
  }, [query, pathname, router, search, searchParams]); // Run the effect when query, pathname, router, or search changes

  return (
    <>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />{' '}
      {/* Render the Search icon */}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        type="search"
        placeholder="Search products by name or SKU"
        className="h-10 w-full rounded-xl bg-background pl-8"
      />
    </>
  );
}
