import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { UserPlus, Shield, List, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <Link href="/" className="flex items-center space-x-3 mb-6">
              <Shield className="h-6 w-6 text-emerald-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h2>
            </Link>
            <nav className="space-y-2">
              <Link href="/admin/dashboard" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                <UserPlus className="h-5 w-5 mr-3" />
                Dashboard
              </Link>
              <Link href="/admin/manage-staff" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                <List className="h-5 w-5 mr-3" />
                Staff Queue
              </Link>
              <Link href="/admin/users" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                <List className="h-5 w-5 mr-3" />
                User Management
              </Link>
              <Link href="/admin/settings" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
            <Link href="/api/auth/signout" className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}