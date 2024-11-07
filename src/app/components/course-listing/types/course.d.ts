import { Course as CourseType, SubscriptionType as SubType } from '../../../components/course-creator/types/course';

export type SubscriptionType = SubType;
export type Course = CourseType;

export interface CourseUpdate {
  accessType: SubscriptionType;
  stripePriceId?: string;
  isPublic: boolean;
  updatedAt: string;
}

export interface CourseListingProps {
  onCourseSelect?: (course: Course) => void;
} 