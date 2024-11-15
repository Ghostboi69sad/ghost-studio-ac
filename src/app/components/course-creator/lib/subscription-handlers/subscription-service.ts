import { SubscriptionPlan } from '../../types/payment';
import { toast } from 'react-hot-toast';
import { User } from 'firebase/auth';

export async function checkSubscriptionStatus(
  userId: string,
  courseId?: string,
  user?: User
): Promise<boolean> {
  try {
    if (!user) {
      throw new Error('المستخدم مطلوب للمصادقة');
    }

    const token = await user.getIdToken();
    const response = await fetch('/api/subscription/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        courseId,
        paymentMethod: 'paypal',
      }),
    });

    if (!response.ok) {
      throw new Error('فشل التحقق من حالة الاشتراك');
    }

    const data = await response.json();
    return data.isValid && data.courseAccess;
  } catch (error) {
    console.error('خطأ في التحقق من حالة الاشتراك:', error);
    return false;
  }
}

export async function handleSubscriptionAccess(courseId: string, userId: string): Promise<boolean> {
  try {
    const hasAccess = await checkSubscriptionStatus(userId, courseId);
    if (!hasAccess) {
      toast.error('يجب أن يكون لديك اشتراك نشط للوصول إلى هذه الدورة');
      return false;
    }
    return true;
  } catch (error) {
    console.error('خطأ في التحقق من صلاحية الوصول:', error);
    return false;
  }
}
