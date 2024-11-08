export type AccessType = 'free' | 'subscription';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: 'monthly' | 'yearly';
  features: string[];
}

export interface CourseAccess {
  type: AccessType;
  subscriptionRequired?: boolean;
}
