'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error('خطأ في التطبيق:', error);
  }, [error]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <div className='bg-white p-8 rounded-lg shadow-md text-center'>
        <h2 className='text-2xl font-bold mb-4'>حدث خطأ ما</h2>
        <p className='text-gray-600 mb-4'>نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
        <div className='space-y-4'>
          <button
            onClick={reset}
            className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
          >
            حاول مرة أخرى
          </button>
          <button
            onClick={() => router.push('/courses')}
            className='block w-full text-blue-500 hover:underline'
          >
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
