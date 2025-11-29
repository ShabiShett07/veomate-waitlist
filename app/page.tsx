'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, isUsingPlaceholderCredentials, saveToLocalStorage } from '@/lib/supabase';

// Force dynamic rendering since we use Supabase
export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Ensure video plays on mount
    if (videoRef.current) {
      const video = videoRef.current;
      console.log('Video element found:', video);
      console.log('Video src:', video.src);
      console.log('Video readyState:', video.readyState);

      video.play().catch((error) => {
        console.error('Video autoplay failed:', error);
      });

      video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
      });

      video.addEventListener('error', (e) => {
        console.error('Video error:', e);
      });
    } else {
      console.error('Video ref is null');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if we're using placeholder credentials
      if (isUsingPlaceholderCredentials()) {
        // Use localStorage fallback for demo mode
        const result = saveToLocalStorage({
          email,
          completed_signup: false,
          updated_at: new Date().toISOString()
        });

        if (!result.success) {
          setError('Failed to save email. Please try again.');
          setLoading(false);
          return;
        }

        // Navigate to complete signup page with email
        router.push(`/complete-signup?email=${encodeURIComponent(email)}`);
        return;
      }

      // Use Supabase for real database
      const { error: dbError } = await supabase
        .from('waitlist')
        .upsert(
          {
            email,
            completed_signup: false,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'email',
            ignoreDuplicates: false
          }
        )
        .select();

      if (dbError) {
        console.error('Database error:', dbError);
        setError('Failed to save email. Please try again.');
        setLoading(false);
        return;
      }

      // Navigate to complete signup page with email
      router.push(`/complete-signup?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      {/* Global Video Background */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ pointerEvents: 'none', opacity: 0.5 }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="/hero-video.webm" type="video/webm" />
          Your browser does not support the video tag.
        </video>
        {/* Blur Overlay */}
        <div className="absolute inset-0 backdrop-blur-xs bg-black/10"></div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-transparent to-[#0a0a0a]/50"></div>
      </div>

      {/* Hero Section */}
      <section className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center">
        {/* Docs Button */}
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={() => router.push('/user')}
            suppressHydrationWarning
            className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
          >
            <span className="text-gray-200 font-medium group-hover:text-white">Docs</span>
            <svg 
              className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        <div className="w-full max-w-3xl px-4 relative z-10">
          {/* Waitlist Card */}
          <div className="bg-black/55 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-6 md:p-8 shadow-2xl shadow-black/50 hover:border-white/20 transition-all duration-300 group">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
              {/* Left Side: Logo & Brand */}
              <div className="flex flex-col items-center text-center md:items-start md:text-left space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                  <div className="relative bg-[#121212] p-4 rounded-2xl border border-white/10 shadow-inner">
                    <Image
                      src="/logo-dark.png"
                      alt="VeoMate Logo"
                      width={120}
                      height={120}
                      className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">VeoMate</h1>
                  <p className="text-gray-400 text-sm max-w-[180px]">Visual collaboration for modern teams.</p>
                </div>
              </div>

              {/* Divider (Desktop) */}
              <div className="hidden md:block w-px h-48 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

              {/* Right Side: Form */}
              <div className="flex-1 w-full max-w-sm">
                <div className="mb-6 text-center md:text-left">
                  <h3 className="text-xl font-semibold text-white mb-1">Join the Waitlist</h3>
                  <p className="text-gray-400 text-sm">Support us and get 1 month of Pro for free</p>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="space-y-4">
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500 group-focus-within/input:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        suppressHydrationWarning
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-white/30 focus:outline-none text-white placeholder-gray-500 transition-all text-base"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      suppressHydrationWarning
                      className="w-full py-3 rounded-xl bg-white text-black font-bold text-base hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-white/20"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Joining...
                        </span>
                      ) : (
                        'Get Early Access'
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 py-2 rounded-lg">{error}</p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
