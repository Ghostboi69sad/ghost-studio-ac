'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { useAuth } from '../lib/auth-context';
import { Button } from '../lib/ui/button';
import { Input } from '../lib/ui/input';
import { Label } from '../lib/ui/label';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup(email, password);
      toast.success('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 flex items-center justify-center p-4'>
      <div className='bg-white p-8 rounded-lg shadow-xl w-full max-w-md'>
        <h1 className='text-3xl font-bold mb-6 text-center text-gray-800'>إنشاء حساب جديد</h1>
        <form onSubmit={handleRegister} className='space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-gray-700'>
              البريد الإلكتروني
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='أدخل بريدك الإلكتروني'
              value={email}
              onChange={e => setEmail(e.target.value)}
              className='w-full'
              required
              disabled={isLoading}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password' className='text-gray-700'>
              كلمة المرور
            </Label>
            <Input
              id='password'
              type='password'
              placeholder='أدخل كلمة المرور'
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full'
              required
              disabled={isLoading}
            />
          </div>
          <Button
            type='submit'
            className='w-full bg-purple-600 hover:bg-purple-700'
            disabled={isLoading}
          >
            {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </Button>
        </form>
        <p className='mt-4 text-center text-sm text-gray-600'>
          لديك حساب بالفعل؟{' '}
          <Link href='/login' className='text-purple-600 hover:text-purple-700 font-medium'>
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
