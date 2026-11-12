export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
      <div className="prose text-gray-700 space-y-4">
        <p>We offer a strict <strong>24-hour refund window</strong> from the time of successful payment.</p>
        <h2 className="text-xl font-bold mt-6">Eligibility</h2>
        <p>If you request a refund within 24 hours and have not accessed any course materials, you are eligible for a full refund. If you have accessed the course, the refund is subject to Admin approval.</p>
        <h2 className="text-xl font-bold mt-6">Processing</h2>
        <p>Approved refunds will be processed back to the original payment method within 5-7 working days.</p>
      </div>
    </div>
  );
}