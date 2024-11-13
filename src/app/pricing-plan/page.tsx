'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { toast } from 'react-toastify';

interface PlanType {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  paypalPlanId: string;
  description?: string;
  popular?: boolean;
}

const plans: PlanType[] = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 19,
    interval: 'month',
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID!,
    description: 'Perfect for getting started',
    features: [
      'Access to all courses',
      'Monthly live sessions',
      'Community access',
      'Project feedback',
    ],
  },
  {
    id: 'yearly',
    name: 'Annual Plan',
    price: 190,
    interval: 'year',
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID!,
    description: 'Best value for committed learners',
    popular: true,
    features: [
      'All Monthly Plan features',
      'Priority support',
      'Downloadable resources',
      'Certificate of completion',
      '2 months free',
    ],
  },
];

export default function PricingPlan() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const checkCurrentSubscription = async () => {
      if (user) {
        try {
          const response = await fetch('/api/subscription/check-status', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({ userId: user.uid }),
          });

          if (!response.ok) {
            throw new Error('فشل في التحقق من حالة الاشتراك');
          }

          const data = await response.json();
          setCurrentPlan(data.subscriptionDetails?.planId || null);
        } catch (error) {
          console.error('خطأ في التحقق من الاشتراك:', error);
          setError('فشل في التحقق من حالة الاشتراك');
        }
      }
    };

    checkCurrentSubscription();
  }, [user]);

  const handleSubscribe = async (plan: PlanType) => {
    try {
      setLoading(true);
      setError('');

      if (!user) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          planId: plan.paypalPlanId,
          userId: user.uid,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription session');
      }

      const { orderId, links } = await response.json();
      const approvalLink = links.find((link: any) => link.rel === 'approve')?.href;
      
      if (approvalLink) {
        window.location.href = approvalLink;
      } else {
        throw new Error('PayPal approval link not found');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process subscription');
      toast.error('Failed to start subscription process');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 py-12 px-4'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-4xl font-bold text-white text-center mb-12'>Choose Your Plan</h1>

        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8'>
            {error}
          </div>
        )}

        <div className='grid md:grid-cols-2 gap-8'>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-xl p-8 ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {plan.popular && (
                <span className='bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold'>
                  Most Popular
                </span>
              )}

              <h3 className='text-2xl font-bold mt-4'>{plan.name}</h3>
              <p className='text-gray-600 mt-2'>{plan.description}</p>

              <div className='mt-4'>
                <span className='text-4xl font-bold'>${plan.price}</span>
                <span className='text-gray-600'>/{plan.interval}</span>
              </div>

              <ul className='mt-6 space-y-4'>
                {plan.features.map((feature, index) => (
                  <li key={index} className='flex items-center'>
                    <svg
                      className='w-5 h-5 text-purple-500 mr-2'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                        clipRule='evenodd'
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full py-3 px-6 rounded-md font-semibold ${
                  plan.popular
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                }`}
                onClick={() => handleSubscribe(plan)}
                disabled={loading || currentPlan === plan.id}
              >
                {loading
                  ? 'Processing...'
                  : currentPlan === plan.id
                    ? 'Current Plan'
                    : 'Choose Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
