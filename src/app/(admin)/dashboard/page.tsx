"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Users, ShieldCheck, List, Settings, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminStats {
  totalUsers: number;
  pendingStaff: number;
  activeStaff: number;
  adminCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-pulse bg-gray-300 rounded-full w-12 h-12 mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Admin Dashboard
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Users
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total registered users
            </p>
          </CardContent>
        </Card>

        {/* Pending Staff */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Staff
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.pendingStaff}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Users awaiting staff approval
            </p>
          </CardContent>
        </Card>

        {/* Active Staff */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <List className="h-5 w-5 text-green-500" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Staff
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activeStaff}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Currently approved staff members
            </p>
          </CardContent>
        </Card>

        {/* Admin Count */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Admin Count
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.adminCount}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total administrators
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/admin/manage-staff" className="group">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow group-hover:shadow-xl">
            <CardContent className="p-6 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Staff Approval Queue
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Review and approve staff applications
              </p>
              <Button variant="outline" size="sm" className="text-yellow-600 hover:bg-yellow-50">
                View Queue →
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings" className="group">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow group-hover:shadow-xl">
            <CardContent className="p-6 text-center">
              <Settings className="h-10 w-10 mx-auto mb-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Developer Settings
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure feature flags and API settings
              </p>
              <Button variant="outline" size="sm" className="text-gray-600 hover:bg-gray-50">
                Go to Settings →
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}