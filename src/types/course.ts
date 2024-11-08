interface CourseUpdate {
  accessType: 'free' | 'paid' | 'subscription';
  subscriptionType?: 'free' | 'basic' | 'premium';
  isPublic: boolean;
  price: number;
  priceTND?: number;
  stripePriceId?: string;
  paymentMethod?: 'stripe' | 'flouci';
  paymentUrl?: string;
  updatedAt: string;
  updatedBy: string;
}
