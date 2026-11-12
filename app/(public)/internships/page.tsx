"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { useSearchParams } from "next/navigation";

export default function InternshipsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialType = searchParams.get("type") === "paid" ? "paid" : "free";
  const [activeTab, setActiveTab] = useState<"free" | "paid">(initialType as "free" | "paid");

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "paid" || typeParam === "free") {
      setActiveTab(typeParam);
    }

    const q = query(collection(db, "programs"), where("active", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrograms(progs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching programs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [searchParams]);

  if (loading) return <div className="text-center py-20 text-lg font-semibold text-blue-600 animate-pulse">Loading programs...</div>;

  const filteredPrograms = programs.filter((prog) => {
    const isFree = prog.type === "free" || (!prog.type && Number(prog.price) === 0);
    const isPaid = prog.type === "paid" || (!prog.type && Number(prog.price) > 0);
    if (activeTab === "free") return isFree;
    return isPaid;
  });

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden font-sans">
      
      {/* --- BACKGROUND SNAKE LINES & GLOW --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
        <div className="absolute top-[20%] -right-20 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
        <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-green-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>

        <svg className="absolute top-0 left-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1000" fill="none" preserveAspectRatio="none">
          <path d="M-100,200 C200,400 400,0 700,200 C1000,400 1200,100 1500,300" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,300 C200,500 400,100 700,300 C1000,500 1200,200 1500,400" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,400 C200,600 400,200 700,400 C1000,600 1200,300 1500,500" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,500 C200,700 400,300 700,500 C1000,700 1200,400 1500,600" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,600 C200,800 400,400 700,600 C1000,800 1200,500 1500,700" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,700 C200,900 400,500 700,700 C1000,900 1200,600 1500,800" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,800 C200,1000 400,600 700,800 C1000,1000 1200,700 1500,900" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
          <path d="M-100,900 C200,1100 400,700 700,900 C1000,1100 1200,800 1500,1000" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-7xl mx-auto py-16 px-4 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Our Training Programs</h1>
          <p className="text-gray-700 text-lg font-medium">Choose a program to kickstart your career.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl inline-flex shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab("free")}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "free" ? "bg-green-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Free Internships
            </button>
            <button
              onClick={() => setActiveTab("paid")}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "paid" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Paid Internships
            </button>
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 max-w-2xl mx-auto">
            <p className="text-gray-600 text-lg font-medium">No {activeTab} programs available right now. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {filteredPrograms.map((prog) => (
              <div key={prog.id} className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activeTab === "free" ? "bg-green-100 text-green-700 border border-green-200" : "bg-blue-100 text-blue-700 border border-blue-200"
                    }`}>
                      {activeTab === "free" ? "FREE" : "PREMIUM"}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">{prog.title || prog.name}</h2>
                  <p className="text-blue-600 font-semibold mb-4">{prog.duration || "Self Paced"}</p>
                  <p className="text-gray-600 mb-6 line-clamp-3">{prog.description}</p>
                </div>
                
                <div>
                  <div className="text-3xl font-extrabold text-gray-900 mb-6">
                    {activeTab === "free" ? "₹0" : `₹${prog.price}`}
                  </div>
                  
                  {user ? (
                    <Link 
                      href={`/checkout/${prog.id}`} 
                      className={`block text-center text-white py-3.5 rounded-xl font-bold transition-all shadow-lg ${
                        activeTab === "free" ? "bg-green-600 hover:bg-green-700 shadow-green-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                      }`}
                    >
                      {activeTab === "free" ? "Start Learning Free" : "Apply Now"}
                    </Link>
                  ) : (
                    <Link 
                      href="/register" 
                      className="block text-center bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg shadow-gray-200"
                    >
                      Login to Apply
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}