"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase-client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

export default function StudentCertificatePage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCert, setSelectedCert] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchCerts = async () => {
      try {
        const q = query(collection(db, "certificates"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const certs = querySnapshot.docs.map(doc => doc.data());
        setCertificates(certs);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchCerts();
  }, [user]);

  const handleDownload = (cert: any) => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
      alert("Please allow popups to download the certificate.");
      return;
    }

    const verifyUrl = `http://localhost:3000/verify/${cert.referenceNumber}`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${cert.studentName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: landscape; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body class="bg-white">
          <div class="w-full h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-5xl border-8 border-blue-900 p-1 bg-white">
              <div class="border-2 border-yellow-500 p-8 text-center relative bg-white">
                
                <div class="flex justify-between items-start mb-6">
                  <div class="text-left">
                    <p class="text-xs font-bold text-gray-500">C.ID: ${cert.referenceNumber}</p>
                  </div>
                  <div class="text-center">
                    <h3 class="font-serif text-xl font-bold text-gray-800">CITYBYTEHUB</h3>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">Udyam: ${cert.udyamNumber || "UDYAM-RJ-30-0151284"}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-gray-500">${cert.websiteUrl || "www.citybytehub.me"}</p>
                  </div>
                </div>

                <h1 class="font-serif text-4xl md:text-6xl font-bold text-gray-800 tracking-wider mt-6 mb-2">CERTIFICATE</h1>
                <h2 class="text-xl md:text-3xl font-light text-gray-600 tracking-widest mb-8">OF INTERNSHIP</h2>

                <p class="text-gray-500 mb-6 uppercase tracking-wider text-sm">This Certificate is Awarded To</p>

                <h3 class="font-serif text-4xl md:text-5xl text-blue-900 font-bold italic mb-8 border-b-2 border-gray-300 inline-block px-10 pb-2">
                  ${cert.studentName}
                </h3>

                <p class="text-gray-700 leading-relaxed text-sm md:text-base max-w-2xl mx-auto mb-10">
                  ${cert.message || `In recognition of your outstanding performance and dedication during your virtual internship in ${cert.programName} at CITYBYTEHUB from ${cert.startDate} to ${cert.endDate}.`}
                </p>

                <div class="flex flex-col md:flex-row justify-between items-center md:items-end mt-12 gap-8">
                  
                  <div class="text-center">
                    <div class="bg-white p-2 inline-block border">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}" alt="QR" />
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Scan to Verify</p>
                  </div>

                  <div class="text-center text-sm">
                    <p class="font-bold">Issue Date: ${cert.issueDate.split('T')[0]}</p>
                    <p class="text-gray-500 mt-1">Reference: ${cert.referenceNumber}</p>
                  </div>

                  <div class="text-center w-40">
                    ${cert.signatureUrl ? `<img src="${cert.signatureUrl}" alt="Signature" class="h-16 object-contain mx-auto mb-2" />` : `<p class="font-serif text-xl italic text-blue-900 mb-6">CityByteHub</p>`}
                    <div class="border-t border-gray-400 pt-1">
                      <p class="text-xs font-bold text-gray-700">Authorized Signatory</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // FIX: Zyada time do (2 second) taaki Tailwind aur images load ho jayein
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 2000); 
  };

  if (loading) return <div className="p-8 text-center">Loading certificates...</div>;

  if (certificates.length === 0) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-xl font-bold text-gray-700">No Certificate Issued Yet</h2>
        <p className="text-gray-500 mt-2">Please complete your project and wait for admin approval.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">My Certificates</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((cert, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col">
            <div className="bg-blue-50 p-4 border-b text-center">
              <h3 className="font-bold text-lg text-blue-900">{cert.programName}</h3>
              <p className="text-xs text-gray-500 mt-1">Ref: {cert.referenceNumber}</p>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-between text-sm text-gray-600">
              <div className="space-y-2 mb-6">
                <p><span className="font-semibold text-gray-800">Name:</span> {cert.studentName}</p>
                <p><span className="font-semibold text-gray-800">Issue Date:</span> {cert.issueDate.split('T')[0]}</p>
                <p><span className="font-semibold text-gray-800">Duration:</span> {cert.duration}</p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedCert(cert)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  View
                </button>
                <button 
                  onClick={() => handleDownload(cert)}
                  className="flex-1 bg-gray-800 text-white py-2 rounded-lg font-semibold hover:bg-black transition"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl relative my-8">
            
            <div className="p-4 md:p-8 bg-gray-100">
              <div className="p-2 border-8 border-blue-900 rounded-sm relative overflow-hidden bg-white">
                <div className="border-2 border-yellow-500 p-8 md:p-12 text-center relative z-10 bg-white">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-500">C.ID: {selectedCert.referenceNumber}</p>
                    </div>
                    <div className="text-center">
                      <h3 className="font-serif text-xl font-bold text-gray-800">CITYBYTEHUB</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Udyam: {selectedCert.udyamNumber || "UDYAM-RJ-30-0151284"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{selectedCert.websiteUrl || "www.citybytehub.me"}</p>
                    </div>
                  </div>

                  <h1 className="font-serif text-4xl md:text-6xl font-bold text-gray-800 tracking-wider mt-6 mb-2">CERTIFICATE</h1>
                  <h2 className="text-xl md:text-3xl font-light text-gray-600 tracking-widest mb-8">OF INTERNSHIP</h2>

                  <p className="text-gray-500 mb-6 uppercase tracking-wider text-sm">This Certificate is Awarded To</p>

                  <h3 className="font-serif text-4xl md:text-5xl text-blue-900 font-bold italic mb-8 border-b-2 border-gray-300 inline-block px-10 pb-2">
                    {selectedCert.studentName}
                  </h3>

                  <p className="text-gray-700 leading-relaxed text-sm md:text-base max-w-2xl mx-auto mb-10">
                    {selectedCert.message || `In recognition of your outstanding performance and dedication during your virtual internship in ${selectedCert.programName} at CITYBYTEHUB from ${selectedCert.startDate} to ${selectedCert.endDate}.`}
                  </p>

                  <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-12 gap-8">
                    
                    <div className="text-center">
                      <div className="bg-white p-2 inline-block border">
                        <QRCodeSVG value={`http://localhost:3000/verify/${selectedCert.referenceNumber}`} size={80} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Scan to Verify</p>
                    </div>

                    <div className="text-center text-sm">
                      <p className="font-bold">Issue Date: {selectedCert.issueDate.split('T')[0]}</p>
                      <p className="text-gray-500 mt-1">Reference: {selectedCert.referenceNumber}</p>
                    </div>

                    <div className="text-center w-40">
                      {selectedCert.signatureUrl ? (
                        <div className="relative w-full h-16 mb-2">
                          <Image src={selectedCert.signatureUrl} alt="Signature" fill className="object-contain" />
                        </div>
                      ) : (
                        <p className="font-signature text-xl italic text-blue-900 mb-6">CityByteHub</p>
                      )}
                      <div className="border-t border-gray-400 pt-1">
                        <p className="text-xs font-bold text-gray-700">Authorized Signatory</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white flex justify-center gap-4 border-t">
              <button 
                onClick={() => handleDownload(selectedCert)}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg shadow-green-200"
              >
                Download (Print as PDF)
              </button>
              <button 
                onClick={() => setSelectedCert(null)}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-700 transition shadow-lg shadow-gray-200"
              >
                Back
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}