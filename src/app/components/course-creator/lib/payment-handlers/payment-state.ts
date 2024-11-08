import { Course, PaymentMethod, AccessType } from '../../types/course';

export interface PaymentState {
  priceUSD: number;
  priceTND: number;
  stripePriceId: string | undefined;
  paymentMethod: PaymentMethod;
  isLoading: boolean;
  error: string | null;
}

export function getInitialPaymentState(course: Course): PaymentState {
  return {
    priceUSD: course.price || 0,
    priceTND: course.priceTND || 0,
    stripePriceId: course.stripePriceId,
    paymentMethod: course.paymentMethod || 'stripe',
    isLoading: false,
    error: null,
  };
}

export function handleAccessTypeChange(
  value: AccessType,
  currentState: PaymentState
): PaymentState {
  if (value === 'free') {
    return {
      ...currentState,
      stripePriceId: '',
      priceUSD: 0,
      priceTND: 0,
      error: null,
    };
  }
  if (value === 'subscription') {
    return {
      ...currentState,
      error: null,
    };
  }
  return currentState;
}

export function handlePaymentMethodChange(
  method: PaymentMethod,
  currentState: PaymentState
): PaymentState {
  return {
    ...currentState,
    paymentMethod: method,
    error: null,
  };
}

export function setPaymentError(error: string | null, currentState: PaymentState): PaymentState {
  return {
    ...currentState,
    error,
    isLoading: false,
  };
}

export function setPaymentLoading(isLoading: boolean, currentState: PaymentState): PaymentState {
  return {
    ...currentState,
    isLoading,
    error: null,
  };
}
