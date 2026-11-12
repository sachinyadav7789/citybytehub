"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchCourses = async () => {
      try {
        const q = query(collection(db, "enrollments"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        // Har enrollment ke liye uske program ki details fetch karo
        const enrollmentsData = await Promise.all(
          querySnapshot.docs.map(async (enrollDoc) => {
            const enrollData = enrollDoc.data();
            
            // Program document fetch karo
            const programRef = doc(db, "programs", enrollData.programId);
            const programSnap = await getDoc(programRef);
            
            let programPrice = 0; // Default 0 maan lo
            
            if (programSnap.exists()) {
               const pData = programSnap.data();
               // Price check karo. Agar price hai toh le lo, warna 0.
               programPrice = Number(pData.price) || 0;
            }

            return {
              id: enrollDoc.id,
              ...enrollData,
              price: programPrice
            };
          })
        );
        
        setCourses(enrollmentsData);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Enrolled Courses</h1>
        <p className="text-gray-500 text-sm mt-1">Continue your learning journey from where you left off.</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Courses Yet</h2>
          <p className="text-gray-500 mb-6">You haven't enrolled in any internship program yet.</p>
          <Link href="/internships" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition">
            Explore Programs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            // Price 0 hai toh Free, nahi toh Premium
            const isFree = course.price === 0;
            
            return (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group">
                
                {/* Top colored bar based on type */}
                <div className={`h-1.5 w-full ${isFree ? 'bg-green-500' : 'bg-blue-600'}`}></div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      isFree 
                        ? "bg-green-50 text-green-700 border border-green-200" 
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {isFree ? "FREE PROGRAM" : "PREMIUM PROGRAM"}
                    </span>
                    <span className="bg-green-50 text-green-600 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Active
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {course.programName}
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    You have full access to all lessons and materials.
                  </p>
                </div>

                <div className="px-6 pb-6 mt-auto">
                  <div className="flex flex-col gap-3">
                    <Link 
                      href={`/lessons/${course.programId}`} 
                      className={`w-full text-center text-white px-4 py-2.5 rounded-xl font-bold transition-all ${
                        isFree ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      Watch Lessons
                    </Link>
                    <Link 
                      href={`/project`} 
                      className="w-full text-center bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
                    >
                      Submit Final Project
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}