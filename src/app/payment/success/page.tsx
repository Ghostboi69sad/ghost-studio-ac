'use client';

import { Suspense } from 'react';
import PaymentSuccessContent from './payment-success-content';

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-800'>
          <div className='bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full mx-4'>
            <h1 className='text-2xl font-bold mb-4'>Loading...</h1>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto'></div>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
