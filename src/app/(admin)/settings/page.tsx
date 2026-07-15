"use client";

import { useState } from 'react';
import DeveloperSettings from '@/components/admin/DeveloperSettings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Developer Settings
      </h1>
      <DeveloperSettings />
    </div>
  );
}