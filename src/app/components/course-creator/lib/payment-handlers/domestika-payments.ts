import { toast } from 'react-hot-toast';

import { Course, PaymentMethod } from '../../types/course';

interface PaymentSetupState {
  priceUSD: number;
  priceTND: number;
  stripePriceId?: string;
  paymentMethod: PaymentMethod;
}

export async function createStripePrice(
  priceUSD: number,
  courseId: string,
  courseName: string
): Promise<string> {
  try {
    if (!priceUSD || priceUSD <= 0) {
      throw new Error('Invalid price amount');
    }

    const response = await fetch('/.netlify/functions/create-stripe-price-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: priceUSD,
        courseId,
        courseName,
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

export function getInitialPaymentState(course: Course): PaymentSetupState {
  return {
    priceUSD: course.price || 0,
    priceTND: course.priceTND || 0,
    stripePriceId: course.stripePriceId,
    paymentMethod: course.paymentMethod || 'stripe',
  };
}

export function handlePaymentMethodChange(
  method: PaymentMethod,
  currentState: PaymentSetupState
): PaymentSetupState {
  if (method === 'stripe') {
    return {
      ...currentState,
      paymentMethod: method,
      priceTND: 0,
    };
  } else {
    return {
      ...currentState,
      paymentMethod: method,
      priceUSD: 0,
      stripePriceId: undefined,
    };
  }
}
