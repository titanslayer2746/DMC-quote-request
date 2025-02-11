'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';

interface EmailResult {
  email: string;
  status: 'success' | 'failed';
  error?: string;
}

export default function Home() {
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use an environment variable for the API base URL (default to localhost if not set)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch the list of countries on mount.
  useEffect(() => {
    const controller = new AbortController();

    const fetchCountries = async () => {
      try {
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/api/countries`, {
          signal: controller.signal,
        });
        setCountries(response.data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load countries';
          setError(errorMessage);
          setStatus('Failed to load countries. Please try again later.');
        }
      }
    };

    fetchCountries();

    return () => {
      controller.abort();
    };
  }, [API_BASE_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    setError(null);

    try {
      const response = await axios.post<{ results: EmailResult[] }>(
        `${API_BASE_URL}/api/send-mails`,
        {
          country: selectedCountry,
          message,
        }
      );

      const successCount = response.data.results.filter(
        (r) => r.status === 'success'
      ).length;
      const failedCount = response.data.results.length - successCount;

      setStatus(
        `Sent ${successCount} email${successCount !== 1 ? 's' : ''}` +
          (failedCount > 0 ? ` (${failedCount} failed)` : '')
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send emails';
      setError(errorMessage);
      setStatus('Failed to send emails. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">DMC Email Sender</h1>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            An error occurred: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700"
            >
              Select Country
            </label>
            <select
              id="country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
              disabled={loading || countries.length === 0}
            >
              <option value="">Choose a country...</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700"
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedCountry || !message}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Emails'}
          </button>
        </form>

        {status && (
          <div
            className={`mt-4 p-3 rounded-md text-sm ${
              status.includes('Failed')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
