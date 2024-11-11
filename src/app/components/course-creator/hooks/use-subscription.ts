import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { toast } from 'react-toastify';

interface SubscriptionDetails {
  planId: string;
  status: string;
  currentPeriodEnd: string;
  subscriptionType: 'free' | 'paid' | 'subscription';
  accessType: 'free' | 'paid' | 'subscription';
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  isLoading: boolean;
  isSubscribed?: boolean;
  subscriptionDetails?: SubscriptionDetails;
  expiryDate?: string;
  error?: string;
}

export function useSubscriptionStatus(courseId?: string): SubscriptionStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasSubscription: false,
    isLoading: true
  });

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setStatus({
          hasSubscription: false,
          isLoading: false
        });
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/subscription/check-status', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ courseId })
        });

        if (!response.ok) {
          throw new Error('فشل التحقق من حالة الاشتراك');
        }

        const data = await response.json();
        setStatus({
          hasSubscription: data.isValid,
          isLoading: false,
          isSubscribed: data.isValid,
          subscriptionDetails: data.subscriptionDetails,
          expiryDate: data.expiryDate
        });
      } catch (error) {
        console.error('خطأ في التحقق من الاشتراك:', error);
        setStatus({
          hasSubscription: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'حدث خطأ غير معروف'
        });
        toast.error('فشل التحقق من حالة الاشتراك');
      }
    };

    checkSubscription();
  }, [user, courseId]);

  return status;
}
