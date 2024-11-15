import paypal from '@paypal/checkout-server-sdk';

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  throw new Error('PayPal credentials are required');
}

// إعداد البيئة المناسبة
const environment =
  process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )
    : new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      );

// إنشاء عميل PayPal
export const paypalClient = new paypal.core.PayPalHttpClient(environment);

// دالة مساعدة للتحقق من حالة البيئة
export const isProduction = () => process.env.NODE_ENV === 'production';

// دالة مساعدة لإنشاء طلب دفع
export async function createPaypalOrder(amount: number, currency: string = 'USD') {
  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toString(),
          },
        },
      ],
    });

    const order = await paypalClient.execute(request);
    return order.result;
  } catch (error) {
    console.error('PayPal order creation error:', error);
    throw error;
  }
}

// دالة مساعدة للتحقق من حالة الطلب
export async function verifyPaypalOrder(orderId: string) {
  try {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const order = await paypalClient.execute(request);
    return order.result;
  } catch (error) {
    console.error('PayPal order verification error:', error);
    throw error;
  }
}

// دالة مساعدة لتنفيذ الدفع
export async function capturePaypalPayment(orderId: string) {
  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const capture = await paypalClient.execute(request);
    return capture.result;
  } catch (error) {
    console.error('PayPal payment capture error:', error);
    throw error;
  }
}
