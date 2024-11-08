import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { checkSubscriptionStatus } from '../lib/subscription-handlers/subscription-service';

export function useSubscriptionCheck() {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasSubscription(false);
        setIsLoading(false);
        return;
      }

      try {
        const status = await checkSubscriptionStatus(user.uid);
        setHasSubscription(status);
      } catch (error) {
        console.error('خطأ في التحقق من الاشتراك:', error);
        setHasSubscription(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user]);

  return { hasSubscription, isLoading };
}
