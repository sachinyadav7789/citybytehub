"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase-client";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function ProjectPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    githubUrl: "",
    liveUrl: "",
    status: "not_submitted",
    adminMessage: ""
  });

  useEffect(() => {
    if (!user) return;
    const fetchProject = async () => {
      try {
        const docRef = doc(db, "projectSubmissions", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProjectData(docSnap.data() as any);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "projectSubmissions", user.uid), {
        uid: user.uid,
        email: user.email,
        title: projectData.title,
        description: projectData.description,
        githubUrl: projectData.githubUrl,
        liveUrl: projectData.liveUrl,
        status: "submitted", // Re-submit karne par wapas submitted ho jayega
        adminMessage: "", // Purana message clear
        submittedAt: new Date().toISOString()
      }, { merge: true });
      
      setProjectData({ ...projectData, status: "submitted", adminMessage: "" });
      setIsEditing(false);
      alert("Project submitted successfully! Admin will review it.");
    } catch (error) {
      alert("Error submitting project");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  // Agar Project pehle se submit hai aur edit mode me nahi hai
  if (projectData.status !== "not_submitted" && !isEditing) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Your Submitted Project</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            projectData.status === "approved" ? "bg-green-100 text-green-700" : 
            projectData.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
          }`}>
            {projectData.status}
          </span>
        </div>

        {/* Admin Message (Agar koi message aaya ho) */}
        {projectData.adminMessage && (
          <div className={`p-4 rounded-lg border ${projectData.status === "rejected" ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
            <p className="font-bold mb-1">Message from Admin:</p>
            <p>{projectData.adminMessage}</p>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
          <p><span className="text-gray-500 font-semibold">Title:</span> {projectData.title}</p>
          <p><span className="text-gray-500 font-semibold">Description:</span> {projectData.description}</p>
          <p><span className="text-gray-500 font-semibold">GitHub:</span> <a href={projectData.githubUrl} target="_blank" className="text-blue-600 hover:underline">{projectData.githubUrl}</a></p>
          <p><span className="text-gray-500 font-semibold">Live URL:</span> <a href={projectData.liveUrl} target="_blank" className="text-blue-600 hover:underline">{projectData.liveUrl}</a></p>
        </div>

        {/* Edit / Re-submit Button (Agar rejected ho tabhi dikhega) */}
        {(projectData.status === "rejected" || projectData.status === "submitted") && (
          <button onClick={() => setIsEditing(true)} className="w-full bg-gray-800 text-white py-2 rounded-lg font-semibold hover:bg-black">
            Edit & Re-submit Project
          </button>
        )}
      </div>
    );
  }

  // Form (Naya submit ya edit karne ke liye)
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
      <h2 className="text-2xl font-bold mb-6">{isEditing ? "Edit Project Details" : "Final Project Submission"}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Project Title" required value={projectData.title} className="w-full p-3 border rounded" onChange={(e) => setProjectData({...projectData, title: e.target.value})} />
        <textarea placeholder="Short Description" required value={projectData.description} className="w-full p-3 border rounded" rows={3} onChange={(e) => setProjectData({...projectData, description: e.target.value})} />
        <input type="url" placeholder="GitHub Repository URL" required value={projectData.githubUrl} className="w-full p-3 border rounded" onChange={(e) => setProjectData({...projectData, githubUrl: e.target.value})} />
        <input type="url" placeholder="Live Deployment URL" required value={projectData.liveUrl} className="w-full p-3 border rounded" onChange={(e) => setProjectData({...projectData, liveUrl: e.target.value})} />
        
        <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700">
          {saving ? "Submitting..." : "Submit Project"}
        </button>
        
        {isEditing && (
          <button type="button" onClick={() => setIsEditing(false)} className="w-full text-gray-500 hover:text-gray-800 font-medium py-2">
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}