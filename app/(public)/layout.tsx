"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Public Navbar (Top Header) */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Side */}
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-blue-600 tracking-tight">
                CITYBYTEHUB
              </Link>
              <nav className="hidden md:flex gap-6">
                <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">Home</Link>
                <Link href="/internships" className="text-gray-600 hover:text-blue-600 font-medium">Internships</Link>
                <Link href="/about" className="text-gray-600 hover:text-blue-600 font-medium">About Us</Link>
                <Link href="/verify" className="text-gray-600 hover:text-blue-600 font-medium">Verify Certificate</Link>
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-sm font-semibold text-gray-700 hover:text-blue-600">
                    My Dashboard
                  </Link>
                  <Link href="/profile" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                    My Profile
                  </Link>
                  <button onClick={handleLogout} className="text-sm text-red-600 font-semibold hover:underline">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700">Login</Link>
                  <Link href="/register" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Apply Now
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-xl font-bold mb-4">CITYBYTEHUB</h3>
            <p className="text-sm">Empowering students with practical skills and real-world project experience.</p>
            <p className="text-sm mt-2">Email: info@citybytehub.me</p>
            <p className="text-sm mt-1">UDYAM: UDYAM-RJ-30-0151284</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-white">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white">Refund Policy (24 Hours)</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          © {new Date().getFullYear()} CITYBYTEHUB. All rights reserved.
        </div>
      </footer>
    </div>
  );
}