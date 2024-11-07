export type SubscriptionType = 'free' | 'paid' | 'subscription';

export interface ContentItem {
  id: string;
  type: 'video' | 'file';
  name: string;
  url: string;
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
  accessType: SubscriptionType;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseListingProps {
  onCourseSelect?: (course: Course) => void;
}

