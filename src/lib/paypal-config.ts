import { PayPalHttpClient, SandboxEnvironment, LiveEnvironment } from '@paypal/checkout-server-sdk';

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  throw new Error('PayPal credentials are required');
}

const environment = process.env.NODE_ENV === 'production'
  ? new LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

export const paypalClient = new PayPalHttpClient(environment);

// دالة مساعدة للتحقق من حالة البيئة
export const isProduction = () => process.env.NODE_ENV === 'production';

// دالة مساعدة لإنشاء طلب دفع
export async function createPaypalOrder(amount: number, currency: string = 'USD') {
  try {
    // التنفيذ هنا...
  } catch (error) {
    console.error('PayPal order creation error:', error);
    throw error;
  }
} 