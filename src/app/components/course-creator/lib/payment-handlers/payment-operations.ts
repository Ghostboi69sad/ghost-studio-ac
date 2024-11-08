import { toast } from 'react-hot-toast';
import { Course } from '../../types/course';

export async function createStripePrice(course: Course, priceUSD: number): Promise<string> {
  try {
    if (!priceUSD || priceUSD <= 0) {
      throw new Error('Invalid price amount');
    }

    const response = await fetch('/.netlify/functions/create-stripe-price-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: priceUSD,
        courseId: course.id,
        courseName: course.title,
        currency: 'usd',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Stripe price');
    }

    const { priceId } = await response.json();
    return priceId;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to create price in Stripe');
    throw error;
  }
}

export async function createFlouciPayment(
  course: Course,
  priceTND: number,
  userId: string
): Promise<string> {
  try {
    const response = await fetch('/api/create-flouci-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: priceTND,
        courseId: course.id,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Flouci payment');
    }

    const { paymentUrl } = await response.json();
    return paymentUrl;
  } catch (error) {
    console.error('Error creating Flouci payment:', error);
    toast.error('Failed to create payment in Flouci');
    throw error;
  }
}

export async function verifyPurchase(
  sessionId: string,
  paymentMethod: 'stripe' | 'flouci',
  courseId: string,
  userId: string
): Promise<boolean> {
  try {
    const endpoint =
      paymentMethod === 'stripe'
        ? '/.netlify/functions/verify-purchase'
        : '/api/verify-flouci-payment';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        courseId,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify purchase');
    }

    const data = await response.json();
    return data.isPurchaseValid;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}
