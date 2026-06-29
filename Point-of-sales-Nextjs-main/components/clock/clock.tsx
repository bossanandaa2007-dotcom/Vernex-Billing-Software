'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Define the DigitalClock component
function DigitalClock(): React.ReactNode {
  // State to store the current time as a string
  const [time, setTime] = useState('');

  // useEffect to update the time every second
  useEffect(() => {
    // Set up an interval to update the time every second
    const intervalId = setInterval(() => {
      const date = new Date();
      // Get hours, minutes, and seconds, and pad with zeros if necessary
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      // Format the new time string
      const newTime = `${hours}:${minutes}:${seconds}`;
      // Update the time state
      setTime(newTime);
    }, 1000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-1 justify-center items-center w-full h-full min-h-[6rem] rounded-xl border border-vernex-border bg-vernex-surface dark:border-[#1E335F] dark:bg-vernex-dark">
      <div
        className="text-3xl font-bold tracking-wider text-vernex-navy dark:text-white"
      >
        <motion.span
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {time} {/* Display the current time */}
        </motion.span>
      </div>
    </div>
  );
}

export default DigitalClock;
