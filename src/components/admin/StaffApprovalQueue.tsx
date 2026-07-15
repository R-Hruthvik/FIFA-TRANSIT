'use client';

import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StaffRequest {
  id: string;
  name: string;
  email: string;
  staffStatus: 'pending' | 'approved' | 'rejected' | 'none';
  createdAt: Date;
  staffRequestedAt?: Date;
}

export default function StaffApprovalQueue() {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending staff requests
  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/users?staffStatus=pending');
      if (!res.ok) throw new Error('Failed to fetch staff requests');
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch staff requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Approve a staff request
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/staff/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve staff request');
      await fetchRequests();
    } catch (err) {
      console.error('Failed to approve staff request:', err);
    }
  };

  // Reject a staff request
  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/staff/${id}/reject`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to reject staff request');
      await fetchRequests();
    } catch (err) {
      console.error('Failed to reject staff request:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading staff requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No pending staff requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Requested At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {request.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {request.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {request.staffRequestedAt ? new Date(request.staffRequestedAt).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-300"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300"
                  >
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}