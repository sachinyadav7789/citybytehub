"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import Link from "next/link";

export default function ProgramsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "programs"));
        
        // Data ko fetch karke filter kar rahe hain (active === true)
        const programsData = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((program: any) => program.active !== false); // Agar active false nahi hai toh dikhao

        setItems(programsData);
      } catch (err: any) {
        console.error("Error fetching programs:", err);
        setError("Failed to load programs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Loading programs...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Training Programs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length > 0 ? (
          items.map((program: any) => (
            <div key={program.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{program.title}</h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{program.description}</p>
              </div>
              
              <div className="mt-4">
                <p className="text-2xl font-bold text-blue-600 mb-4">₹{program.price}</p>
                <Link 
                  href={`/dashboard/programs/${program.id}`} 
                  className="block text-center w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  View Program
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white p-10 rounded-xl border text-center text-gray-500">
            Programs will appear here when published by the CityByteHub admin.
          </div>
        )}
      </div>
    </div>
  );
}