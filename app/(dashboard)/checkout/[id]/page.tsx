"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { doc, getDoc, addDoc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [utr, setUtr] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const UPI_ID = "citybytehub@slc";

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      try {
        const docSnap = await getDoc(doc(db, "programs", id as string));
        if (docSnap.exists()) setProgram({ id: docSnap.id, ...docSnap.data() });

        const profileSnap = await getDoc(doc(db, "studentProfiles", user.uid));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          if (profileData.fullName && profileData.mobile && profileData.college) {
            setProfileComplete(true);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  // Free Program Enroll Logic
  const handleFreeEnroll = async () => {
    if (!user || !program) return;
    setIsUploading(true);
    try {
      const enrollId = `${user.uid}_${program.id}`;
      await setDoc(doc(db, "enrollments", enrollId), {
        uid: user.uid,
        programId: program.id,
        programName: program.title || program.name,
        enrolledAt: serverTimestamp(),
        status: "active"
      });
      alert("Successfully Enrolled! Redirecting to your courses...");
      router.push("/my-courses");
    } catch (error) {
      alert("Failed to enroll. Please try again.");
      setIsUploading(false);
    }
  };

  // Paid Program Payment Submit Logic
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !screenshot || !utr) {
      alert("Please upload screenshot and enter UTR number.");
      return;
    }

    setIsUploading(true);
    try {
      const screenshotUrl = await uploadImageToCloudinary(screenshot);
      
      await addDoc(collection(db, "payments"), {
        uid: user.uid,
        studentName: user.displayName || "Student",
        email: user.email,
        programId: program.id,
        programName: program.name,
        amount: program.price,
        utr: utr,
        screenshotUrl: screenshotUrl,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      setSubmitted(true);
    } catch (error) {
      alert("Error submitting payment. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }
  
  if (!program) return <div className="p-8 text-center">Program not found.</div>;

  // AGAR PROFILE COMPLETE NAHI HAI TOH YAHAN ROK DO
  if (!profileComplete) {
    return (
      <div className="max-w-lg mx-auto mt-20 bg-yellow-50 border border-yellow-200 p-8 rounded-xl text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-yellow-800 mb-2">Profile Incomplete</h2>
        <p className="text-yellow-700 mb-6">Please complete your profile before purchasing a course.</p>
        <Link href="/profile" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
          Complete Profile Now
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-20 bg-white p-8 rounded-xl shadow-sm border text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Under Verification</h2>
        <p className="text-gray-600 mb-6">Your payment proof has been sent to the admin. Please wait for approval.</p>
        <button onClick={() => router.push("/dashboard")} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const isFree = program.type === "free" || (!program.type && Number(program.price) === 0);
  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=CITYBYTEHUB&am=${program.price}&cu=INR`;
  
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Checkout: {program.name || program.title}</h2>
        <Link href="/internships" className="text-sm text-blue-600 hover:underline">← Back</Link>
      </div>
      
      {/* --- FREE PROGRAM FLOW --- */}
      {isFree ? (
        <div className="bg-green-50 border border-green-200 p-8 rounded-lg text-center mt-6">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">This is a Free Internship</h3>
          <p className="text-green-700 mb-8">No payment is required. Click below to start learning immediately.</p>
          <button 
            onClick={handleFreeEnroll}
            disabled={isUploading}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg shadow-green-200 disabled:opacity-70"
          >
            {isUploading ? "Enrolling..." : "Start Learning Free"}
          </button>
        </div>
      ) : (
        /* --- PAID PROGRAM FLOW (Aapka purana UI) --- */
        <>
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center mb-8">
            <p className="text-gray-600 mb-2 font-medium">Total Amount to Pay</p>
            <h3 className="text-4xl font-bold text-blue-600 mb-4">₹{program.price}</h3>
            
            <div className="bg-white p-4 inline-block rounded-xl shadow-sm mb-4">
              <QRCodeSVG value={upiUrl} size={150} />
            </div>
            <p className="text-sm text-gray-500 mb-1">Scan this QR with any UPI App</p>
            <p className="font-mono font-bold text-lg text-gray-800">{UPI_ID}</p>
          </div>

          <div className="mb-8">
            <p className="text-sm text-gray-600 text-center mb-3">Or pay directly using:</p>
            <div className="flex justify-center gap-4">
              <a href={upiUrl} className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-semibold hover:bg-purple-200">PhonePe</a>
              <a href={upiUrl} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-200">GPay</a>
              <a href={upiUrl} className="bg-cyan-100 text-cyan-700 px-4 py-2 rounded-lg font-semibold hover:bg-cyan-200">Paytm</a>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-red-600 mb-4 text-center">IMPORTANT: After Payment</h3>
            
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 text-sm text-red-800">
              <p className="mb-2">1. Take a screenshot of the successful payment.</p>
              <p>2. Enter the 12-digit UTR / Transaction ID below.</p>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Upload Payment Screenshot</label>
                <input type="file" accept="image/*" required onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="w-full border p-3 rounded-lg" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Enter UTR / Transaction ID (12 digits)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 123456789012" 
                  maxLength={12}
                  onChange={(e) => setUtr(e.target.value)} 
                  className="w-full border-2 border-gray-300 p-4 text-lg font-mono rounded-lg focus:border-blue-500 focus:outline-none" 
                />
              </div>

              <button type="submit" disabled={isUploading} className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition">
                {isUploading ? "Submitting..." : "Submit Payment Proof"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}