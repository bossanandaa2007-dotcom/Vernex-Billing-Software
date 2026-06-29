import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

function DateComponent(): React.ReactNode {
  // State to store the formatted date
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    // Update the date every second
    const intervalId = setInterval(() => {
      const currentDate = new Date();
      // Format the date to "Day of the week, Month-Year" (e.g., "Monday, May-2024")
      const formattedDate = format(currentDate, 'EEEE, MMMM-yyyy');
      // Update the date state with the formatted date
      setDate(formattedDate);
    }, 1000);

    // Clean up the interval to prevent memory leaks
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-1 justify-center items-center w-full h-full min-h-[6rem] rounded-xl border border-vernex-border bg-vernex-surface px-4 dark:border-[#1E335F] dark:bg-vernex-dark">
      {/* Motion div for animation */}
      <motion.div
        className="text-center text-xl font-semibold text-vernex-navy dark:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {date}
      </motion.div>
    </div>
  );
}

export default DateComponent;
