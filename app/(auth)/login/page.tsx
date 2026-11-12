"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext"; // <-- Auth check import

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth(); // <-- Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Agar user pehle se login hai, toh direct dashboard bhej do
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        setSuccessMsg("We have sent a verification link to your email. Please check your Inbox or Spam folder.");
        await auth.signOut();
        return;
      }
      
      router.push("/"); // Login ke baad Home Page
    } catch (err: any) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset password.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Password reset link sent to your email! Please check your inbox.");
    } catch (err: any) {
      setError("Error sending reset email. Make sure the email is correct.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setSuccessMsg("");
      const provider = new GoogleAuthProvider();
      await auth.signOut();
      await signInWithPopup(auth, provider);
      router.push("/"); // Google login ke baad Home Page
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Agar auth loading ho raha hai ya user login hai, toh loading screen dikhao
  if (authLoading || user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md relative">
        
        <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 mb-6 inline-block">
          ← Back to Home
        </Link>

        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        
        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-4 text-sm">
            <p className="font-semibold mb-1 flex items-center gap-2">
              <span>✉️</span> Email Sent
            </p>
            <p>{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" required className="w-full p-3 border rounded" onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full p-3 border rounded" onChange={(e) => setPassword(e.target.value)} />
          
          <div className="text-right">
            <button type="button" onClick={handleForgotPassword} className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </button>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6">
          <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account? <Link href="/register" className="text-blue-600 font-semibold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}