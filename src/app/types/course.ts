export interface Course {
  id: string;
  title: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  videoCount?: number;
  subscriptionType: 'free' | 'paid' | 'subscription';
  instructor: string;
  duration: string;
  level: string;
  isPublic: boolean;
  accessType: 'free' | 'paid';
  stripePriceId?: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  content: ContentItem[];
  lessons: Lesson[];
}

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
  duration: string;
  description?: string;
}
