"use client";

import { useState, useEffect } from "react";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase-client";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  
  const [unlockedFields, setUnlockedFields] = useState<any>({}); 
  const [status, setStatus] = useState("pending");
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    college: "",
    university: "",
    rollNumber: "",
    branch: "",
    govtIdType: "Aadhar",
    govtIdNumber: "",
  });

  const [photoUrl, setPhotoUrl] = useState("");
  const [govtIdPhotoUrl, setGovtIdPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "studentProfiles", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          fullName: data.fullName || user.displayName || "",
          email: data.email || user.email || "",
          mobile: data.mobile || "",
          college: data.college || "",
          university: data.university || "",
          rollNumber: data.rollNumber || "",
          branch: data.branch || "",
          govtIdType: data.govtIdType || "Aadhar",
          govtIdNumber: data.govtIdNumber || "",
        });
        setPhotoUrl(data.photoUrl || "");
        setGovtIdPhotoUrl(data.govtIdPhotoUrl || "");
        setStatus(data.status || "pending");
        setUnlockedFields(data.unlockedFields || {});
        setRequestHistory(data.requestHistory || []);
      } else {
        setFormData(prev => ({
          ...prev,
          fullName: user.displayName || "",
          email: user.email || "", 
        }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
              resolve(newFile);
            }
          }, "image/jpeg", 0.7);
        };
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isIdPhoto: boolean = false) => {
    if (!e.target.files || e.target.files.length === 0) return;
    let file = e.target.files[0];
    if (isIdPhoto) setIsUploadingId(true);
    else setIsUploading(true);
    try {
      if (file.size > 1024 * 1024) file = await compressImage(file);
      const url = await uploadImageToCloudinary(file);
      if (isIdPhoto) setGovtIdPhotoUrl(url || "");
      else setPhotoUrl(url || "");
    } catch (error) {
      alert("Photo upload failed!");
    } finally {
      if (isIdPhoto) setIsUploadingId(false);
      else setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // STRICT VALIDATION - Bypass nahi ho sakta
    if (!formData.fullName.trim() || !formData.mobile.trim() || !formData.college.trim() || !formData.university.trim() || !formData.rollNumber.trim() || !formData.branch.trim() || !formData.govtIdNumber.trim()) {
      alert("Please fill all required fields.");
      return;
    }

    if (!photoUrl || !govtIdPhotoUrl) {
      alert("Please upload both Profile Photo and Govt ID Photo.");
      return;
    }
    
    setSaving(true);
    try {
      const dataToUpdate: any = {
        status: "submitted", 
        unlockedFields: {},
        requestMessage: "",
        updatedAt: new Date().toISOString(),
      };

      if (isEditable("fullName")) dataToUpdate.fullName = formData.fullName;
      if (isEditable("mobile")) dataToUpdate.mobile = formData.mobile;
      if (isEditable("college")) dataToUpdate.college = formData.college;
      if (isEditable("university")) dataToUpdate.university = formData.university;
      if (isEditable("branch")) dataToUpdate.branch = formData.branch;
      if (isEditable("rollNumber")) dataToUpdate.rollNumber = formData.rollNumber;
      if (isEditable("govtIdNumber")) {
        dataToUpdate.govtIdType = formData.govtIdType;
        dataToUpdate.govtIdNumber = formData.govtIdNumber;
      }
      if (isEditable("photoUrl")) dataToUpdate.photoUrl = photoUrl;
      if (isEditable("govtIdPhotoUrl")) dataToUpdate.govtIdPhotoUrl = govtIdPhotoUrl;

      await setDoc(doc(db, "studentProfiles", user.uid), dataToUpdate, { merge: true });
      
      setStatus("submitted");
      setUnlockedFields({});
      
      alert("Profile saved successfully! It is now locked.");
    } catch (error: any) {
      alert("Error saving profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !requestMessage.trim()) return alert("Please enter a message.");
    
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    const recentRequests = requestHistory.filter((req: any) => new Date(req.date) > fifteenDaysAgo);
    
    if (recentRequests.length >= 2) {
      alert("You have reached the maximum limit of 2 requests in 15 days. Please wait for admin to unlock.");
      return;
    }

    try {
      const newRequest = { message: requestMessage, date: now.toISOString() };
      const updatedHistory = [...requestHistory, newRequest];

      await setDoc(doc(db, "studentProfiles", user.uid), {
        status: "update_requested",
        requestMessage: requestMessage,
        requestHistory: updatedHistory,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      setStatus("update_requested");
      setIsRequestModalOpen(false);
      setRequestMessage("");
      alert("Request sent to Admin successfully!");
    } catch (error) {
      alert("Error sending request.");
    }
  };

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold">Loading profile...</div>;

  const isEditable = (fieldName: string) => {
    if (status === "pending") return true;
    return unlockedFields[fieldName] === true;
  };

  const inputClass = (fieldName: string) => 
    `w-full p-3 border rounded-xl font-medium transition-all outline-none ${
      !isEditable(fieldName) 
        ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
        : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
    }`;

  const isLocked = ["submitted", "approved", "update_requested"].includes(status);

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
            <p className="text-gray-500 text-sm mt-1">Manage your personal and academic details.</p>
          </div>
          {isLocked && (
            <span className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 ${
              status === 'update_requested' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              {status === 'update_requested' ? 'Pending Admin Approval' : 'Locked (Under Review)'}
            </span>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Profile Photo Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center overflow-hidden relative border-4 border-white shadow-md">
              {photoUrl ? (
                <Image src={photoUrl} alt="Profile" fill className="object-cover" />
              ) : (
                <span className="text-gray-400 text-sm font-medium">No Photo</span>
              )}
            </div>
            <div className="text-center sm:text-left">
              <label className={`inline-block px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                !isEditable("photoUrl") 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white border-2 border-gray-200 text-gray-700 cursor-pointer hover:border-blue-500 hover:text-blue-600 shadow-sm'
              }`}>
                {isUploading ? "Uploading..." : "Upload Profile Photo *"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, false)} disabled={isUploading || !isEditable("photoUrl")} />
              </label>
              <p className="text-xs text-gray-500 mt-2">Max size: 1MB. JPG, PNG allowed.</p>
            </div>
          </div>

          {/* Personal Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input type="text" required value={formData.fullName} disabled={!isEditable("fullName")} className={inputClass("fullName")} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="Enter your full name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input type="email" value={formData.email} disabled className="w-full p-3 border rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200 font-medium" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number (10 digits) *</label>
                <input type="tel" required maxLength={10} value={formData.mobile} disabled={!isEditable("mobile")} className={inputClass("mobile")} onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})} placeholder="Enter 10 digit mobile number" />
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Academic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">College Name *</label>
                <input type="text" required value={formData.college} disabled={!isEditable("college")} className={inputClass("college")} onChange={(e) => setFormData({...formData, college: e.target.value})} placeholder="Enter your college name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">University Name *</label>
                <input type="text" required value={formData.university} disabled={!isEditable("university")} className={inputClass("university")} onChange={(e) => setFormData({...formData, university: e.target.value})} placeholder="Enter university name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Roll Number *</label>
                <input type="text" required value={formData.rollNumber} disabled={!isEditable("rollNumber")} className={inputClass("rollNumber")} onChange={(e) => setFormData({...formData, rollNumber: e.target.value})} placeholder="Enter roll number" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Branch (e.g., CSE, BCA) *</label>
                <input type="text" required value={formData.branch} disabled={!isEditable("branch")} className={inputClass("branch")} onChange={(e) => setFormData({...formData, branch: e.target.value})} placeholder="Enter your branch" />
              </div>
            </div>
          </div>

          {/* Govt ID Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Government ID Verification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ID Type *</label>
                <select value={formData.govtIdType} disabled={!isEditable("govtIdNumber")} className={inputClass("govtIdNumber")} onChange={(e) => setFormData({...formData, govtIdType: e.target.value})}>
                  <option value="Aadhar">Aadhar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ID Number *</label>
                <input type="text" required value={formData.govtIdNumber} disabled={!isEditable("govtIdNumber")} className={inputClass("govtIdNumber")} onChange={(e) => setFormData({...formData, govtIdNumber: e.target.value})} placeholder="Enter ID number" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-32 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-gray-200 shadow-sm">
                {govtIdPhotoUrl ? (
                  <Image src={govtIdPhotoUrl} alt="ID" fill className="object-cover" />
                ) : (
                  <span className="text-gray-400 text-xs font-medium text-center">No ID Photo</span>
                )}
              </div>
              <div className="text-center sm:text-left">
                <label className={`inline-block px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                  !isEditable("govtIdPhotoUrl") 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border-2 border-gray-200 text-gray-700 cursor-pointer hover:border-blue-500 hover:text-blue-600 shadow-sm'
                }`}>
                  {isUploadingId ? "Uploading..." : "Upload Govt ID Photo *"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, true)} disabled={isUploadingId || !isEditable("govtIdPhotoUrl")} />
                </label>
                <p className="text-xs text-gray-500 mt-2">Max size: 1MB. Clear photo required.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t pt-6">
            {!isLocked ? (
              <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70">
                {saving ? "Saving..." : "Save & Submit Profile"}
              </button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-5 rounded-xl text-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="font-bold mb-1">Profile Locked</p>
                  <p>Your profile is under review or approved. To make changes, request edit permission.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsRequestModalOpen(true)} 
                  disabled={status === 'update_requested'}
                  className={`px-6 py-2 rounded-lg font-bold whitespace-nowrap transition ${
                    status === 'update_requested' 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md shadow-yellow-200'
                  }`}
                >
                  {status === 'update_requested' ? "Request Pending..." : "Request Edit"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Profile Edit</h3>
            <p className="text-xs text-red-500 font-semibold mb-4 bg-red-50 p-2 rounded-lg border border-red-100">
              Note: You can only send 2 requests in 15 days.
            </p>
            <textarea 
              placeholder="Please specify what you want to edit and why. (e.g., My mobile number is wrong)" 
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl mb-6 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" 
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSendRequest} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}