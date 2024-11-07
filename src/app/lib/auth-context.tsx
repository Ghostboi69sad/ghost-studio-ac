'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from './firebase';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  sendEmailVerification 
} from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';

interface AuthUser extends User {
  role?: 'admin' | 'user';
  hasPurchased?: boolean;
  hasActiveSubscription?: boolean;
  subscription?: {
    status: 'active' | 'inactive' | 'cancelled';
    planId?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const userRef = ref(database, `users/${authUser.uid}`);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          setUser({ ...authUser, role: userData?.role || 'user' });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
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
      createdAt: new Date().toISOString()
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};