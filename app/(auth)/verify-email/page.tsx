export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
        <p className="text-gray-600 mb-6">
          We have sent a verification link to your email. Please verify it to continue.
        </p>
        <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded">Go to Login</a>
      </div>
    </div>
  );
}