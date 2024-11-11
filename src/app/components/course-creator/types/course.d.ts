export type SubscriptionType = 'free' | 'paid' | 'subscription';
export type AccessType = 'free' | 'paid' | 'subscription';
export type PaymentMethod = 'stripe' | 'flouci';

export interface ContentItem {
  id: string;
  type: 'video' | 'file';
  name: string;
  url: string;
   locked?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  duration?: string;
  description?: string;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  content: ContentItem[];
  lessons: Lesson[];
}

export interface Course {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  price: number;
  subscriptionType: SubscriptionType;
  accessType: AccessType;
  imageUrl: string;
  videoCount: number;
  rating: number;
  chapters: Chapter[];
  isPublic: boolean;
  thumbnail: string;
  instructor: string;
  duration: string;
  level: string;
  enrolledStudents: number;
  paymentUrl?: string;
  paymentMethod?: PaymentMethod;
  stripePriceId?: string;
  purchasedBy?: string[];
  s3Url?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  createdBy?: string;
  priceTND?: number;
}

export interface CourseUpdate {
  accessType: AccessType;
  subscriptionType: SubscriptionType;
  isPublic: boolean;
  price: number;
  stripePriceId?: string;
  paymentUrl?: string;
  paymentMethod?: PaymentMethod;
  updatedAt: string;
  updatedBy: string;
  priceTND?: number;
}

export interface DomestikaCourseCreatorProps {
  initialCourse: Course;
  onSave: (course: Course) => Promise<void>;
  onPurchase?: (courseId: string, paymentMethod: PaymentMethod) => Promise<void>;
}

export interface CourseListingProps {
  courses: Course[];
  onCourseSelect?: (course: Course) => void;
}

export interface UserProgress {
  courseId: string;
  completedLessons: string[];
  lastAccessed: string;
  progress: number;
}
