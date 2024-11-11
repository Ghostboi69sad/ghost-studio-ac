'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from './firebase';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  getAuth,
  UserCredential,
} from 'firebase/auth';
import { ref, get, set, onValue, getDatabase } from 'firebase/database';
import { backupDatabase, restoreDatabase } from '../../scripts/backup';

export interface AuthUser extends User {
  role?: 'admin' | 'user';
  hasActiveSubscription?: boolean;
  purchases?: {
    [courseId: string]: {
      purchaseDate: string;
      status: 'active' | 'expired';
    }
  };
  hasPurchased?: (courseId: string) => boolean;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  },
  signup: async () => {
    throw new Error('AuthContext not initialized');
  },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const database = getDatabase();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const subscriptionRef = ref(database, `subscriptions/${firebaseUser.uid}`);
        const purchasesRef = ref(database, `purchases/${firebaseUser.uid}`);

        try {
          const [userSnapshot, subscriptionSnapshot, purchasesSnapshot] = await Promise.all([
            get(userRef),
            get(subscriptionRef),
            get(purchasesRef),
          ]);

          const userData = userSnapshot.val();
          const subscriptionData = subscriptionSnapshot.val();
          const purchasesData = purchasesSnapshot.val();

          const authUser: AuthUser = {
            ...firebaseUser,
            role: userData?.role || 'user',
            hasActiveSubscription: subscriptionData?.status === 'active',
            purchases: purchasesData || {},
            hasPurchased: (courseId: string) => purchasesData?.[courseId]?.status === 'active',
            getIdToken: () => firebaseUser.getIdToken()
          };

          setUser(authUser);
        } catch (error) {
          console.error('خطأ في جلب بيانات المستخدم:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      throw new Error('Please verify your email before logging in');
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const signup = async (email: string, password: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);

    // Create user record in Realtime Database
    const userRef = ref(database, `users/${userCredential.user.uid}`);
    await set(userRef, {
      email: userCredential.user.email,
      role: 'user',
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
