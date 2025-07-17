import React from 'react';
import { AIAdminUploadZone } from '@/components/ai/AIAdminUploadZone';

const AIKnowledgeBase: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">AI Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's AI training documents and context data
          </p>
        </div>
        
        <AIAdminUploadZone />
      </div>
    </div>
  );
};

export default AIKnowledgeBase;