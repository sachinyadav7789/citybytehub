"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext"; // <-- Import

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth(); // <-- Auth check
  const [formData, setFormData] = useState({ name: "", email: "", mobile: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Agar user pehle se login hai, toh direct dashboard bhej do
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await sendEmailVerification(userCredential.user);
      router.push("/verify-email");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard"); 
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Agar auth loading ho raha hai ya user login hai, toh kuch mat dikhao
  if (authLoading || user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md relative">
        
        <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 mb-6 inline-block">
          ← Back to Home
        </Link>

        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" placeholder="Full Name" required className="w-full p-3 border rounded" onChange={(e) => setFormData({...formData, name: e.target.value})} />
          <input type="email" placeholder="Email" required className="w-full p-3 border rounded" onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <input type="tel" placeholder="Mobile Number" required className="w-full p-3 border rounded" onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          <input type="password" placeholder="Password" required className="w-full p-3 border rounded" onChange={(e) => setFormData({...formData, password: e.target.value})} />
          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700">
            {loading ? "Creating..." : "Register with Email"}
          </button>
        </form>

        <div className="mt-4">
          <button onClick={handleGoogleLogin} className="w-full bg-red-500 text-white p-3 rounded font-semibold hover:bg-red-600">
            Continue with Google
          </button>
        </div>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-blue-600 font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}