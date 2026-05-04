//app/onboarding/page.tsx
'use client';
import { useUser } from '@clerk/nextjs';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OnboardingContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get('redirect_url') || '/products';

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizePhone = (phone: string): string => {
    const cleaned = phone.trim();
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('0'))    return '+254' + cleaned.slice(1);
    if (cleaned.startsWith('254'))  return '+' + cleaned;
    return cleaned;
  };

  const validatePhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    return /^\+254[0-9]\d{8}$/.test(normalized);
  };

  const handleSubmit = async () => {
    if (!isLoaded || !user) return;

    if (!validatePhone(phone)) {
      setError('Enter a valid Kenyan number e.g. 0712345678 or +254712345678');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/update-phone`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            phone: normalizePhone(phone),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save phone');

      router.push(redirectUrl);

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Smart Ecommerce
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            One last step to complete your profile
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
          <p className="text-slate-300 text-sm mb-6">
            Welcome,{' '}
            <span className="text-white font-semibold">{user?.firstName}</span>!
            Add your WhatsApp number so buyers can reach you.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                WhatsApp / Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-white/10 rounded-l-lg bg-white/5 text-slate-400 text-sm">
                  🇰🇪 +254
                </span>
                <input
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  className="flex-1 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-r-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                💬 Buyers will contact you on this number via WhatsApp
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !phone}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Save & Continue →'}
            </button>

            <button
              type="button"
              onClick={() => router.push(redirectUrl)}
              className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}