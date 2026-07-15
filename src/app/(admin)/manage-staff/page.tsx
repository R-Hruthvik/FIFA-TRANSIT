"use client";

import { useState } from 'react';
import StaffApprovalQueue from '@/components/admin/StaffApprovalQueue';

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Staff Approval Queue
      </h1>
      <StaffApprovalQueue />
    </div>
  );
}