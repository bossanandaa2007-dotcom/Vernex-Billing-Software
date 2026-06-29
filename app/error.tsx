'use client';

import { useEffect } from 'react';
import { toast } from 'react-toastify';

function getRenderableError(error: unknown) {
  if (error instanceof Error && typeof error.message === 'string') return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Something went wrong.';
  }
}

const ErrorPage = ({ error }: { error: Error }) => {
  const message = getRenderableError(error);

  useEffect(() => {
    toast.error(`An error occurred: ${message}`);
  }, [message]);

  return <div>An error occurred: {message}</div>;
};

export default ErrorPage;
