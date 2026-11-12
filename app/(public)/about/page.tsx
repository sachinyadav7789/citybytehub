"use client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden flex flex-col justify-center">
      
      {/* --- BACKGROUND SNAKE LINES & GLOW --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Colorful Glow Blobs */}
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
        <div className="absolute top-[20%] -right-20 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
        <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-green-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>

        {/* Snake/Wave Lines SVG */}
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
      <div className="max-w-4xl mx-auto py-16 px-4 relative z-10">
        <div className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            About <span className="text-blue-600">CITYBYTEHUB</span>
          </h1>
          
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              CITYBYTEHUB is dedicated to bridging the gap between academic learning and industry requirements. We provide intensive, project-based training to students across India.
            </p>
            <p>
              We offer a wide range of <strong>Free and Premium internship programs</strong> in domains like Data Analytics and Web Development. Whether you are looking for a short-term 1-month bootcamp or a comprehensive 3-6 month training, our programs are designed to simulate real corporate environments.
            </p>
            <p>
              We don't just teach code; we teach you how to build and deliver production-ready applications. Join us to upskill, work on live projects, and earn a verified certificate that boosts your career.
            </p>
          </div>
          
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Why Students Trust Us?</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✔</span> Flexible Duration (1 to 6 Months)
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✔</span> Free & Premium Options Available
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✔</span> Real-World Live Projects
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✔</span> Verified QR Certificate
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}