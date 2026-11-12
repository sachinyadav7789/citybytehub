export async function uploadImageToCloudinary(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ml_default"); 
  
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    alert("Cloud Name missing in .env.local");
    return;
  }

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    
    // YAHAN ERROR DIKHEGA
    if (data.error) {
      alert("Cloudinary Error: " + data.error.message);
      console.error("Cloudinary Error Details:", data);
      return;
    }

    return data.secure_url;
  } catch (error: any) {
    alert("Network Error: " + error.message);
    console.error("Network Error:", error);
  }
}