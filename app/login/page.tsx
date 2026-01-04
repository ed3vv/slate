'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import { supabase } from '@/lib/supabaseClient';

export default function SignIn() {
  const { loading } = useAuth(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [rememberMe, setRememberMe] = useState(true);

  const handleEmailAuth = async () => {
    setError('');
    setNotice('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (mode === 'signup' && !username.trim()) {
      setError('Please enter a username.');
      return;
    }
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Note: Supabase automatically persists sessions in localStorage by default
        // If "remember me" is unchecked, we'll sign out when the tab/window closes
        if (!rememberMe) {
          // Store a flag to sign out on tab close
          sessionStorage.setItem('autoSignOut', 'true');
        } else {
          sessionStorage.removeItem('autoSignOut');
        }
      } else {
        // Check if username is already taken
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username.trim().toLowerCase())
          .maybeSingle();

        if (existingUser) {
          setError('Username is already taken. Please choose another.');
          return;
        }

        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Store username temporarily to set after email confirmation
        if (data.user) {
          sessionStorage.setItem('pendingUsername', username.trim());
        }

        setNotice('Check your inbox to confirm your email, then sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow border">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Slate Planner</h1>
          <p className="mt-2 text-muted-foreground">
            {mode === 'signin' ? 'Sign in to sync your data' : 'Create an account to get started'}
          </p>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {notice && <p className="text-green-500 text-sm text-center">{notice}</p>}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
              placeholder="••••••••"
            />
          </div>
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-sm text-foreground">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                placeholder="username"
              />
            </div>
          )}
          {mode === 'signin' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="rememberMe" className="text-sm text-foreground cursor-pointer">
                Remember me on this device
              </label>
            </div>
          )}
          <button
            onClick={handleEmailAuth}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium"
          >
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
