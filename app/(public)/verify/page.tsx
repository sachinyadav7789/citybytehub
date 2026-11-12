"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const [certId, setCertId] = useState("");
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;
    router.push(`/verify/${certId.trim()}`);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 relative overflow-hidden bg-gray-50">
      
      {/* --- BACKGROUND SNAKE LINES & GLOW --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Colorful Glow Blobs */}
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-40"></div>
        <div className="absolute top-[20%] -right-20 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-40"></div>

        {/* Snake/Wave Lines SVG (Darker Colors & Higher Opacity) */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1000" fill="none" preserveAspectRatio="none">
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

      {/* --- MAIN CONTENT (Bold & Solid) --- */}
      <div className="max-w-2xl w-full text-center relative z-10">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Verify Certificate</h1>
        <p className="text-gray-700 font-medium mb-8 text-lg">
          Enter the unique reference number printed on the certificate to verify its authenticity.
        </p>

        <form onSubmit={handleVerify} className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto">
          <input 
            type="text" 
            placeholder="E.G., CBH-2026-****" 
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            className="flex-1 p-4 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none text-lg font-bold text-gray-800 uppercase bg-white shadow-sm"
          />
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Verify
          </button>
        </form>
        
        <p className="text-sm font-medium text-gray-500 mt-6 bg-white/60 inline-block px-4 py-2 rounded-lg backdrop-blur-sm">
          Example format: CBH-2026-XXXX. You can find this number at the bottom left of the certificate.
        </p>
      </div>
    </div>
  );
}