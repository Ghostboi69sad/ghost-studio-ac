import { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { cookies } from 'next/headers';

export function useSubscription() {
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
        const response = await fetch('/api/check-subscription');
        const data = await response.json();

        // تحديث الكوكيز مع تاريخ انتهاء الاشتراك
        document.cookie = `subscription_status=${data.hasActiveSubscription};path=/;max-age=3600`;

        setHasSubscription(data.hasActiveSubscription);
      } catch (error) {
        console.error('خطأ في التحقق من حالة الاشتراك:', error);
        setHasSubscription(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();

    // التحقق كل ساعة
    const interval = setInterval(checkSubscription, 3600000);
    return () => clearInterval(interval);
  }, [user]);

  return { hasSubscription, isLoading };
}
