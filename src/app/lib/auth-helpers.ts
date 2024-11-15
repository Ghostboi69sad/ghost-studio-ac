import { AuthUser } from './auth-context';

export const isAdminUser = (user: AuthUser | null): boolean => {
  return Boolean(user?.role === 'admin');
};
