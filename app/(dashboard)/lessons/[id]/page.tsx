"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";

export default function CourseLessonPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  const [hasProject, setHasProject] = useState(false);
  const [requested, setRequested] = useState(false);
  const [certificateIssued, setCertificateIssued] = useState(false); // NEW

  const [miniProjectLink, setMiniProjectLink] = useState("");
  const [isSubmittingProj, setIsSubmittingProj] = useState(false);
  
  const [isReWatching, setIsReWatching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      try {
        // 1. Course fetch
        const courseSnap = await getDoc(doc(db, "programs", id as string));
        if (courseSnap.exists()) setCourse({ id: courseSnap.id, ...courseSnap.data() });

        // 2. Progress fetch
        const localProgressKey = `progress_${id}_${user.uid}`;
        const savedLocalProgress = localStorage.getItem(localProgressKey);
        
        let dbProgress: string[] = [];
        const userSnap = await getDoc(doc(db, "studentProfiles", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.progress && userData.progress[id as string]) {
            dbProgress = userData.progress[id as string];
          }
        }

        const localArray = savedLocalProgress ? JSON.parse(savedLocalProgress) : [];
        const finalProgress = Array.from(new Set([...dbProgress, ...localArray]));
        
        setCompletedLessons(finalProgress);
        localStorage.setItem(localProgressKey, JSON.stringify(finalProgress));

        if (finalProgress.length > 0 && finalProgress.length < (courseSnap.data()?.lessons?.length || 0)) {
          setCurrentLessonIndex(finalProgress.length);
        }

        // 3. Project check
        const projSnap = await getDoc(doc(db, "projectSubmissions", user.uid));
        if (projSnap.exists()) setHasProject(true);

        // 4. Certificate Request check
        if (userSnap.exists() && userSnap.data().certificateRequested) {
          setRequested(true);
        }

        // 5. CERTIFICATE ISSUED CHECK (NAYA)
        const certQuery = query(
          collection(db, "certificates"), 
          where("uid", "==", user.uid),
          where("programName", "==", courseSnap.data()?.name)
        );
        const certSnap = await getDocs(certQuery);
        if (!certSnap.empty) {
          setCertificateIssued(true);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleCompleteLesson = async () => {
    if (!course || !user || !course.lessons) return;

    const currentLessonId = course.lessons[currentLessonIndex].id;
    if (completedLessons.includes(currentLessonId)) {
      if (currentLessonIndex < course.lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      }
      return; 
    }

    const newProgress = [...completedLessons, currentLessonId];
    setCompletedLessons(newProgress);
    localStorage.setItem(`progress_${id}_${user.uid}`, JSON.stringify(newProgress));

    try {
      await setDoc(doc(db, "studentProfiles", user.uid), {
        uid: user.uid,
        email: user.email,
        [`progress.${course.id}`]: newProgress,
      }, { merge: true });
      
      if (currentLessonIndex < course.lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      }
    } catch (error) {
      console.error("Failed to save progress", error);
    }
  };

  const handleMiniProjectSubmit = async () => {
    if (!user || !course || !miniProjectLink) return alert("Please enter project link.");
    setIsSubmittingProj(true);
    try {
      await addDoc(collection(db, "miniProjects"), {
        uid: user.uid,
        studentName: user.displayName || "Student",
        programId: course.id,
        lessonId: course.lessons[currentLessonIndex].id,
        lessonTitle: course.lessons[currentLessonIndex].title,
        projectLink: miniProjectLink,
        submittedAt: new Date().toISOString()
      });
      alert("Mini Project submitted successfully!");
      setMiniProjectLink("");
    } catch (error) {
      alert("Error submitting project.");
    } finally {
      setIsSubmittingProj(false);
    }
  };

  const handleRequestCertificate = async () => {
    if (!user || !course) return;
    if (!hasProject) {
      alert("Please submit your final project first before requesting a certificate.");
      router.push("/project");
      return;
    }
    try {
      await setDoc(doc(db, "studentProfiles", user.uid), { certificateRequested: true }, { merge: true });
      
      await addDoc(collection(db, "certificateRequests"), {
        uid: user.uid,
        studentName: user.displayName || "Student",
        email: user.email,
        programId: course.id,
        programName: course.name,
        status: "pending",
        requestedAt: new Date().toISOString()
      });

      setRequested(true);
      alert("Certificate Request sent to Admin successfully!");
    } catch (error) {
      alert("Error sending request.");
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("<iframe")) {
      const match = url.match(/src="([^"]+)"/);
      return match ? match[1] : "";
    }
    if (url.includes("watch?v=")) {
      const videoId = url.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.length === 11 && !url.includes(".")) {
      return `https://www.youtube.com/embed/${url}`;
    }
    return url;
  };

  if (loading) return <div className="p-8 text-center">Loading course...</div>;
  if (!course) return <div className="p-8 text-center">Course not found.</div>;
  if (!course.lessons || course.lessons.length === 0) return <div className="p-8 text-center text-gray-500">Admin has not added any videos yet.</div>;

  const currentLesson = course.lessons[currentLessonIndex];
  const isCurrentCompleted = completedLessons.includes(currentLesson.id);
  const isAllCompleted = completedLessons.length === course.lessons.length;

  if (isAllCompleted && !isReWatching) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
         <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">{course.name}</h1>
          <Link href="/my-courses" className="text-sm text-blue-600 hover:underline">← Back to My Courses</Link>
        </div>

        <div className="bg-green-50 border border-green-200 p-8 rounded-xl text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">Training Completed!</h3>
          <p className="text-green-700 mb-6 max-w-2xl mx-auto">
            Congratulations on completing all the video lessons! Now, to get your certificate, please make sure you have submitted your final project.
          </p>
          
          <div className="flex gap-4 justify-center mt-6">
            
            {/* MAIN LOGIC: Agar Certificate Issue ho gaya, toh 'View Certificate' dikhao */}
            {certificateIssued ? (
              <Link 
                href="/certificate" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                View Certificate
              </Link>
            ) : requested ? (
              <div className="bg-white inline-block px-6 py-3 rounded-lg border border-green-300 font-semibold text-green-700">
                ✅ Certificate Request Pending with Admin
              </div>
            ) : (
              <button 
                onClick={handleRequestCertificate}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                Request Certificate
              </button>
            )}
            
            <button 
              onClick={() => setIsReWatching(true)}
              className="bg-gray-800 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-black transition shadow-lg shadow-gray-200"
            >
              Watch Videos Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{course.name}</h1>
        <Link href="/my-courses" className="text-sm text-blue-600 hover:underline">← Back to My Courses</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="aspect-video bg-black flex items-center justify-center w-full">
          {currentLesson.youtubeUrl ? (
            <iframe width="100%" height="100%" src={getEmbedUrl(currentLesson.youtubeUrl)} title={currentLesson.title} allowFullScreen className="w-full h-full"></iframe>
          ) : <p className="text-white">No video available.</p>}
        </div>

        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{currentLesson.title}</h2>
              <p className="text-gray-500 text-sm">Lesson {currentLessonIndex + 1} of {course.lessons.length}</p>
            </div>
            <div className="flex gap-3">
              {currentLesson.notesUrl && (
                <a href={currentLesson.notesUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-100 px-4 py-2 rounded-lg font-medium text-blue-600 hover:bg-gray-200 transition">📄 Download Notes</a>
              )}
              
              {!isCurrentCompleted ? (
                <button onClick={handleCompleteLesson} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition">
                  Mark as Complete
                </button>
              ) : (
                currentLessonIndex < course.lessons.length - 1 && (
                  <button onClick={() => setCurrentLessonIndex(currentLessonIndex + 1)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Next Video →
                  </button>
                )
              )}
            </div>
          </div>

          {currentLesson.miniProjectTitle && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
              <h3 className="font-bold text-blue-800 mb-1">Mini Project: {currentLesson.miniProjectTitle}</h3>
              <p className="text-sm text-blue-700 mb-3">{currentLesson.miniProjectDesc}</p>
              <div className="flex gap-2">
                <input type="url" placeholder="Paste your Live Project Link here..." value={miniProjectLink} onChange={(e) => setMiniProjectLink(e.target.value)} className="flex-1 p-2 border rounded text-sm" />
                <button onClick={handleMiniProjectSubmit} disabled={isSubmittingProj} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSubmittingProj ? "Sending..." : "Submit Project"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="font-bold text-lg mb-4">Course Content</h3>
        <div className="space-y-2">
          {course.lessons.map((lesson: any, index: number) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const isCurrent = index === currentLessonIndex;
            const isLocked = index > currentLessonIndex && !isCompleted;

            return (
              <div key={lesson.id} className={`p-4 rounded-lg border flex justify-between items-center transition ${isCurrent ? "border-blue-500 bg-blue-50" : isCompleted ? "border-green-200 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <div>
                  <h4 className="font-medium text-gray-800">{index + 1}. {lesson.title}</h4>
                  {isCompleted && <span className="text-xs text-green-600 font-bold">✓ Completed</span>}
                </div>
                {isLocked ? (
                  <span className="text-gray-400 text-sm flex items-center gap-1">🔒 Locked</span>
                ) : (
                  <button onClick={() => setCurrentLessonIndex(index)} className={`text-sm font-semibold ${isCurrent ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}>
                    {isCurrent ? "Watching" : "Watch"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}