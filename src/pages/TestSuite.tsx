import React from 'react';
import { DKPUploadTest } from '@/components/test/DKPUploadTest';
import { SecurityGuard } from '@/components/security/SecurityGuard';

const TestSuite: React.FC = () => {
  return (
    <SecurityGuard requiredRole="admin">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Maturion Test Suite</h1>
          <p className="text-muted-foreground">
            Development and testing tools for Diamond Knowledge Pack implementation and org web ingestion.
          </p>
        </div>
        
        <DKPUploadTest />
      </div>
    </SecurityGuard>
  );
};

export default TestSuite;