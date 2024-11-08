import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';

export function useSubscriptionStatus() {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setHasSubscription(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/check-subscription', {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error('فشل التحقق من حالة الاشتراك');
        }

        const data = await response.json();
        setHasSubscription(data.hasActiveSubscription);
      } catch (error) {
        console.error('خطأ في التحقق من الاشتراك:', error);
        setHasSubscription(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  return { hasSubscription, isLoading };
}
