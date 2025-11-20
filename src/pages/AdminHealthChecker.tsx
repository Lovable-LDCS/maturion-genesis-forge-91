import React from 'react';
import { HealthChecker } from '@/components/qa/HealthChecker';

/**
 * Admin Health Checker Page
 * 
 * Provides access to the QA Health Checker system for admin users.
 * This page allows running comprehensive health checks against the
 * ARCHITECTURE.md (True North) and qa/requirements.json specifications.
 * 
 * Features:
 * - One-click QA execution
 * - Human-readable reports
 * - Component-level failure details
 * - Strict mode toggle for production validation
 * - Architecture compliance checking
 * - Wiring verification
 * - Build integrity checks
 * - Security validation
 * 
 * Admin Only: This page should only be accessible to admin users
 */
const AdminHealthChecker: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">System Health Checker</h1>
        <p className="text-muted-foreground">
          Comprehensive QA validation against architecture specifications
        </p>
      </div>
      
      <HealthChecker />
    </div>
  );
};

export default AdminHealthChecker;
