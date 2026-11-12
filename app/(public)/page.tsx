"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export default function Home() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "programs"), where("active", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrograms(progs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const freePrograms = programs.filter(p => p.type === "free" || (!p.type && Number(p.price) === 0)).slice(0, 3);
  const paidPrograms = programs.filter(p => p.type === "paid" || (!p.type && Number(p.price) > 0)).slice(0, 3);

  return (
    <div className="min-h-screen bg-white font-sans relative overflow-hidden">
      
      {/* --- BACKGROUND SNAKE LINES & GLOW --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Colorful Glow Blobs */}
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse"></div>
        <div className="absolute top-[20%] -right-20 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[20%] -left-20 w-[500px] h-[500px] bg-green-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: '4s' }}></div>

        {/* Snake/Wave Lines SVG */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1000" fill="none" preserveAspectRatio="none">
          {/* Red Line */}
          <path d="M-100,200 C200,400 400,0 700,200 C1000,400 1200,100 1500,300" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          {/* Green Line */}
          <path d="M-100,300 C200,500 400,100 700,300 C1000,500 1200,200 1500,400" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          {/* Blue Line */}
          <path d="M-100,400 C200,600 400,200 700,400 C1000,600 1200,300 1500,500" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
          {/* Yellow Line */}
          <path d="M-100,500 C200,700 400,300 700,500 C1000,700 1200,400 1500,600" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
          {/* Purple Line */}
          <path d="M-100,600 C200,800 400,400 700,600 C1000,800 1200,500 1500,700" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
          {/* Pink Line */}
          <path d="M-100,700 C200,900 400,500 700,700 C1000,900 1200,600 1500,800" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
          {/* Cyan Line */}
          <path d="M-100,800 C200,1000 400,600 700,800 C1000,1000 1200,700 1500,900" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          {/* Orange Line */}
          <path d="M-100,900 C200,1100 400,700 700,900 C1000,1100 1200,800 1500,1000" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* --- BACKGROUND STICKERS (Poore Page Ke Kinaron Par) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Left Side: Free Program Stickers */}
        <div className="absolute top-0 left-0 w-64 h-full hidden lg:block">
          <div className="absolute top-[5%] -left-10 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-60 transform -rotate-12">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
          <div className="absolute top-[20%] left-4 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-50 transform rotate-6">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
          <div className="absolute top-[35%] -left-6 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-40 transform -rotate-6">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
          <div className="absolute top-[50%] left-8 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-50 transform rotate-12">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
          <div className="absolute top-[65%] -left-4 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-60 transform -rotate-12">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
          <div className="absolute top-[80%] left-6 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-40 transform rotate-6">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
          <div className="absolute top-[95%] -left-10 bg-green-50 p-5 rounded-2xl w-56 border border-green-200 opacity-50 transform -rotate-6">
            <h2 className="text-xl font-black text-green-600 mb-2">Free Program</h2>
            <div className="h-1.5 w-3/4 bg-green-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-green-300 rounded"></div>
          </div>
        </div>

        {/* Right Side: Paid Program Stickers */}
        <div className="absolute top-0 right-0 w-64 h-full hidden lg:block">
          <div className="absolute top-[10%] -right-10 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-60 transform rotate-12">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
          <div className="absolute top-[25%] right-4 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-50 transform -rotate-6">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
          <div className="absolute top-[40%] -right-6 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-40 transform rotate-6">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
          <div className="absolute top-[55%] right-8 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-50 transform -rotate-12">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
          <div className="absolute top-[70%] -right-4 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-60 transform rotate-12">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
          <div className="absolute top-[85%] right-6 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-40 transform -rotate-6">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
          <div className="absolute top-[95%] -right-10 bg-blue-50 p-5 rounded-2xl w-56 border border-blue-200 opacity-50 transform rotate-6">
            <h2 className="text-xl font-black text-blue-600 mb-2">Paid Program</h2>
            <div className="h-1.5 w-3/4 bg-blue-300 rounded mb-2"></div><div className="h-1.5 w-1/2 bg-blue-300 rounded"></div>
          </div>
        </div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-20 z-10">
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm text-blue-600 text-sm font-semibold mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Build Your Career With Us
          </span>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-gray-900">
            Practical Training. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Real-World Experience.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join CITYBYTEHUB to work on live projects, master industry skills, and earn a verified certificate that employers trust.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/internships" className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 w-full sm:w-auto">
              Explore All Programs
            </Link>

            {user ? (
              <Link href="/dashboard" className="px-8 py-4 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-bold text-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                Dashboard
              </Link>
            ) : (
              <Link href="/register" className="px-8 py-4 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-bold text-lg transition-all w-full sm:w-auto">
                Create Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* --- PROGRAMS SECTION --- */}
      <section className="py-16 bg-white/60 border-t border-gray-100 relative z-10 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore Our Programs</h2>
            <p className="text-gray-600 text-lg">Choose the path that fits your career goals.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Left Column: Free Programs */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Free Internships</h3>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Start Learning</span>
                </div>
                <div className="space-y-4">
                  {freePrograms.length > 0 ? freePrograms.map(prog => (
                    <div key={prog.id} className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{prog.title || prog.name}</h4>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-1">{prog.description}</p>
                        <p className="text-green-600 font-bold mt-2">₹0</p>
                      </div>
                      <Link href={`/internships?type=free`} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap">
                        Start Free
                      </Link>
                    </div>
                  )) : <p className="text-gray-500">No free programs available right now.</p>}
                </div>
              </div>

              {/* Right Column: Paid Programs */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Premium Internships</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">Career Boost</span>
                </div>
                <div className="space-y-4">
                  {paidPrograms.length > 0 ? paidPrograms.map(prog => (
                    <div key={prog.id} className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{prog.title || prog.name}</h4>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-1">{prog.description}</p>
                        <p className="text-blue-600 font-bold mt-2">₹{prog.price}</p>
                      </div>
                      <Link href={`/internships?type=paid`} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap">
                        Apply Now
                      </Link>
                    </div>
                  )) : <p className="text-gray-500">No paid programs available right now.</p>}
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* --- WHY CHOOSE US --- */}
      <section className="py-20 bg-white/80 border-t border-gray-100 relative z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose CITYBYTEHUB?</h2>
            <p className="text-gray-600 text-lg">We focus on practical implementation, not just theory.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "💻", title: "Live Projects", desc: "Work on real-world assignments and build a portfolio that gets you hired." },
              { icon: "🏆", title: "Verified Certificate", desc: "Receive a secure certificate with a unique QR code for employers to verify." },
              { icon: "🚀", title: "GitHub Submission", desc: "Submit your final project on GitHub and get feedback from industry experts." }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-50/90 backdrop-blur-sm p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-3xl mb-6 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}