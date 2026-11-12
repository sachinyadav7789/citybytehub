"use client";

import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.displayName || user?.email?.split('@')[0] || "Student"}!
        </h2>
        <p className="text-gray-600 mt-2">
          Ready to continue your learning journey?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-semibold text-lg mb-4">Your Programs</h3>
          <p className="text-gray-500 text-sm mb-4">You haven't purchased any program yet.</p>
          <Link href="/programs" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm inline-block">
            Explore Programs
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-semibold text-lg mb-4">Profile Status</h3>
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg text-sm">
            <span>⚠️</span> Profile incomplete. Please complete your profile to continue.
          </div>
          <Link href="/profile" className="block mt-4 bg-gray-100 text-center py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            Complete Profile
          </Link>
        </div>
      </div>
    </div>
  );
}