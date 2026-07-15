"use client";

import { useState, useEffect } from 'react';
import UserTable from '@/components/admin/UserTable';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          User Management
        </h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <UserTable searchTerm={searchTerm} />
    </div>
  );
}