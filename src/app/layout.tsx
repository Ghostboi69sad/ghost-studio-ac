/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Metadata } from 'next';
import localFont from 'next/font/local';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { ToastContainer } from 'react-toastify';

import { AuthProvider } from './lib/auth-context';
import ToastProvider from '../components/providers/toast-provider';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Course Management',
  description: 'Course management platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning={true}>
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <AuthProvider>{children}</AuthProvider>
        <ToastProvider />
        <Toaster position='top-center' />
        <ToastContainer
          position='top-right'
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme='dark'
        />
      </body>
    </html>
  );
}
