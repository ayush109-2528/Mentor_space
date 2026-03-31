"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Code2, LogOut, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Signup successful! You can now log in.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isMasterUser = user?.email === process.env.NEXT_PUBLIC_MASTER_EMAIL;

  const handleJoin = (role) => {
    if (roomId.trim()) {
      router.push(`/session/${roomId}?role=${role}&email=${user?.email}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] flex flex-col items-center justify-center text-white font-sans p-6 relative">
      
      {/* Link to About Page */}
      <div className="absolute top-6 right-6">
        <Link href="/about" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors text-sm font-medium bg-[#161925] px-4 py-2 rounded-full border border-[#2a2f42]">
          <Info size={16} /> How it works
        </Link>
      </div>

      <div className="max-w-md w-full bg-[#161925] border border-[#2a2f42] rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Code2 className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">MentorSpace</h1>
        <p className="text-slate-400 text-center text-sm mb-8">Professional 1-on-1 coding environments</p>

        {!user ? (
          <form onSubmit={handleAuth} className="space-y-4 mt-4">
            <input
              type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-[#0f111a] border border-[#2a2f42] rounded-xl focus:border-emerald-500 focus:outline-none text-slate-200"
            />
            <input
              type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 bg-[#0f111a] border border-[#2a2f42] rounded-xl focus:border-emerald-500 focus:outline-none text-slate-200"
            />
            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-2">
              {isLoginMode ? "Log In" : "Create Account"}
            </button>
            <p className="text-center text-xs text-slate-400 cursor-pointer hover:text-emerald-400 transition-colors mt-4" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Log In"}
            </p>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center bg-[#0f111a] border border-[#2a2f42] p-3 rounded-xl mb-6">
              <span className="text-xs text-slate-300 truncate pr-4 font-medium">
                {user.email} 
                {isMasterUser && <span className="ml-2 bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">MASTER</span>}
              </span>
              <button onClick={handleLogout} className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 rounded-lg transition-colors"><LogOut size={16}/></button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Workspace ID</label>
              <input
                type="text" placeholder="e.g. react-123" value={roomId} onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f111a] border border-[#2a2f42] rounded-xl focus:border-emerald-500 focus:outline-none text-slate-200"
              />
            </div>
            
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <button onClick={() => handleJoin('host')} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl transition-all text-sm shadow-lg shadow-emerald-900/20">
                  Host Session
                </button>
                <button onClick={() => handleJoin('student')} className="flex-1 py-3 bg-[#2a2f42] hover:bg-[#32384e] font-semibold rounded-xl transition-all text-sm text-white">
                  Join Session
                </button>
              </div>
              
              {isMasterUser && (
                <button onClick={() => handleJoin('master')} className="w-full py-3 bg-rose-600 hover:bg-rose-500 font-bold tracking-wider rounded-xl transition-all text-sm shadow-lg shadow-rose-900/20 mt-2">
                  OVERRIDE AS MASTER
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}