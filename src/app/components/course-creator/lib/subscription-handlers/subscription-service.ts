import { SubscriptionPlan } from '../../types/payment';
import { toast } from 'react-hot-toast';

export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/check-subscription?userId=${userId}`);
    const { hasActiveSubscription } = await response.json();
    return hasActiveSubscription;
  } catch (error) {
    console.error('خطأ في التحقق من حالة الاشتراك:', error);
    return false;
  }
}

export async function handleSubscriptionAccess(courseId: string, userId: string): Promise<boolean> {
  try {
    const hasSubscription = await checkSubscriptionStatus(userId);
    if (!hasSubscription) {
      toast.error('يجب أن يكون لديك اشتراك نشط للوصول إلى هذه الدورة');
      return false;
    }
    return true;
  } catch (error) {
    console.error('خطأ في التحقق من صلاحية الوصول:', error);
    return false;
  }
}
