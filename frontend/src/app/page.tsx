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
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
          setError('Failed to load countries');
        }
      }
    };

    fetchCountries();
    return () => controller.abort();
  }, [API_BASE_URL]);

  useEffect(() => {
    if (!selectedCountry) {
      setRegions([]);
      setSelectedRegions([]);
      setSelectAll(false);
      return;
    }

    const fetchRegions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/regions?country=${selectedCountry}`);
        setRegions(response.data);
        setSelectedRegions([]);
        setSelectAll(false);
      } catch {
        setRegions([]);
      }
    };

    fetchRegions();
  }, [selectedCountry]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions([...regions]);
    }
    setSelectAll(!selectAll);
  };

  const handleRegionChange = (region: string) => {
    const updatedRegions = selectedRegions.includes(region)
      ? selectedRegions.filter((r) => r !== region)
      : [...selectedRegions, region];

    setSelectedRegions(updatedRegions);
    setSelectAll(updatedRegions.length === regions.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<{ results: EmailResult[] }>(
        `${API_BASE_URL}/api/send-mails`,
        {
          country: selectedCountry,
          regions: selectedRegions,
          message,
        }
      );

      const successCount = response.data.results.filter((r) => r.status === 'success').length;
      const failedCount = response.data.results.length - successCount;

      setStatus(`Sent ${successCount} email${successCount !== 1 ? 's' : ''}` +
          (failedCount > 0 ? ` (${failedCount} failed)` : ''));
    } catch {
      setError('Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">DMC Email Sender</h1>

        {error && <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3"
              required
            >
              <option value="">Choose a country...</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {regions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Regions</label>
              <div className="space-y-2">
                <label className="flex items-center font-medium">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="mr-2"
                  />
                  Select All
                </label>
                {regions.map((region) => (
                  <label key={region} className="flex items-center">
                    <input
                      type="checkbox"
                      value={region}
                      checked={selectedRegions.includes(region)}
                      onChange={() => handleRegionChange(region)}
                      className="mr-2"
                    />
                    {region}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedCountry || !message || selectedRegions.length === 0}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md"
          >
            {loading ? 'Sending...' : 'Send Emails'}
          </button>
          {status && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{status}</div>}
        </form>
      </div>
    </div>
  );
}
