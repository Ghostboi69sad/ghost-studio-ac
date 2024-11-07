'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from "../lib/ui/input"
import { Button } from "../lib/ui/button"
import { Label } from "../lib/ui/label"
import { useAuth } from '../lib/auth-context'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      router.push('/courses')
    } catch (error) {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Welcome Back</h1>
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
            Sign In
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-purple-600 hover:text-purple-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}