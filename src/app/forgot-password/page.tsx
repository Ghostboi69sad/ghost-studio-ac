'use client';

import { useState } from 'react';

import { sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { auth } from '../../lib/firebase';
import { Button } from '../lib/ui/button';
import { Input } from '../lib/ui/input';
import { Label } from '../lib/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      router.push('/login');
    } catch (error: any) {
      console.error('خطأ في إرسال البريد:', error);
      toast.error(error.message || 'فشل في إرسال رابط إعادة تعيين كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 flex items-center justify-center p-4'>
      <div className='bg-white p-8 rounded-lg shadow-xl w-full max-w-md'>
        <h1 className='text-2xl font-bold text-center mb-6'>نسيت كلمة المرور</h1>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-gray-700'>
              البريد الإلكتروني
            </Label>
            <Input
              id='email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className='w-full'
              placeholder='أدخل بريدك الإلكتروني'
              disabled={isLoading}
            />
          </div>
          <Button
            type='submit'
            disabled={isLoading}
            className='w-full bg-purple-600 hover:bg-purple-700'
          >
            {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </Button>
          <div className='text-center mt-4'>
            <Link href='/login' className='text-sm text-purple-600 hover:text-purple-800'>
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
