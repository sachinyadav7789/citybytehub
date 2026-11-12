"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

export default function VerifyCertificateResultPage() {
  const { certId } = useParams();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const q = query(collection(db, "certificates"), where("referenceNumber", "==", certId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setCert(querySnapshot.docs[0].data());
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (certId) verify();
  }, [certId]);

  if (loading) return <div className="p-20 text-center text-lg font-semibold">Verifying...</div>;
  
  if (notFound) return (
    <div className="p-20 text-center max-w-lg mx-auto mt-20 bg-white rounded-xl shadow-sm border">
      <div className="text-6xl mb-4">❌</div>
      <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Certificate</h2>
      <p className="text-gray-600 mb-6">The reference number you entered is not valid or does not exist in our records.</p>
      <Link href="/verify" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
        Try Again
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold text-lg shadow-sm border border-green-300">
          <span className="text-2xl">✅</span> Certificate Verified Successfully
        </div>
        <p className="text-gray-500 mt-2 text-sm">This is a genuine certificate issued by CITYBYTEHUB.</p>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-4 md:p-8 rounded-xl shadow-2xl border">
        <div className="p-2 border-8 border-blue-900 rounded-sm relative overflow-hidden bg-white">
          <div className="border-2 border-yellow-500 p-8 md:p-12 text-center relative z-10 bg-white">
            
            <div className="flex justify-between items-start mb-6">
              <div className="text-left">
                <p className="text-xs font-bold text-gray-500">C.ID: {cert.referenceNumber}</p>
              </div>
              <div className="text-center">
                <h3 className="font-serif text-xl font-bold text-gray-800">CITYBYTEHUB</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Udyam: {cert.udyamNumber || "UDYAM-RJ-30-0151284"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{cert.websiteUrl || "www.citybytehub.me"}</p>
              </div>
            </div>

            <h1 className="font-serif text-4xl md:text-6xl font-bold text-gray-800 tracking-wider mt-6 mb-2">CERTIFICATE</h1>
            <h2 className="text-xl md:text-3xl font-light text-gray-600 tracking-widest mb-8">OF INTERNSHIP</h2>

            <p className="text-gray-500 mb-6 uppercase tracking-wider text-sm">This Certificate is Awarded To</p>

            <h3 className="font-serif text-4xl md:text-5xl text-blue-900 font-bold italic mb-8 border-b-2 border-gray-300 inline-block px-10 pb-2">
              {cert.studentName}
            </h3>

            <p className="text-gray-700 leading-relaxed text-sm md:text-base max-w-2xl mx-auto mb-10">
              {cert.message || `In recognition of your outstanding performance and dedication during your virtual internship in ${cert.programName} at CITYBYTEHUB from ${cert.startDate} to ${cert.endDate}.`}
            </p>

            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-12 gap-8">
              
              <div className="text-center">
                <div className="bg-white p-2 inline-block border">
                  <QRCodeSVG value={`http://localhost:3000/verify/${cert.referenceNumber}`} size={80} />
                </div>
                <p className="text-xs text-gray-500 mt-2">Scan to Verify</p>
              </div>

              <div className="text-center text-sm">
                <p className="font-bold">Issue Date: {cert.issueDate.split('T')[0]}</p>
                <p className="text-gray-500 mt-1">Reference: {cert.referenceNumber}</p>
              </div>

              <div className="text-center w-40">
                {cert.signatureUrl ? (
                  <div className="relative w-full h-16 mb-2">
                    <Image src={cert.signatureUrl} alt="Signature" fill className="object-contain" />
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

      <div className="text-center mt-8 text-sm text-gray-500">
        <p>This certificate is the property of CITYBYTEHUB. For any queries, contact <a href="mailto:info@citybytehub.me" className="text-blue-600 hover:underline">info@citybytehub.me</a></p>
      </div>
    </div>
  );
}