import { PaymentMethod, Course } from '../app/components/course-creator/types/course';
import { toast } from 'react-hot-toast';

export async function handlePayment(course: Course, userId: string, paymentMethod: PaymentMethod) {
  try {
    if (paymentMethod === 'stripe') {
      if (!course.stripePriceId) {
        throw new Error('Stripe price ID not found');
      }

      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: course.stripePriceId,
          userId,
          courseId: course.id,
          mode: 'payment',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      window.location.href = `https://checkout.stripe.com/c/pay/${sessionId}`;
    } else if (paymentMethod === 'flouci') {
      const response = await fetch('/api/create-flouci-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: course.price,
          courseId: course.id,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Flouci payment');
      }

      const { paymentUrl } = await response.json();
      window.location.href = paymentUrl;
    }
  } catch (error) {
    console.error('Payment error:', error);
    toast.error('Failed to process payment');
    throw error;
  }
}
