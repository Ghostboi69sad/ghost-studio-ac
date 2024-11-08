interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  hasPurchased?: boolean;
  hasActiveSubscription?: boolean;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // ... باقي الأساليب
}
