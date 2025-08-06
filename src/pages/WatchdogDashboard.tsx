import React from 'react';
import { WatchdogControlPanel } from '@/components/watchdog';
import { AIConfidenceHeatmap } from '@/components/ai/AIConfidenceHeatmap';
import { NavigationHelper } from '@/components/ui/navigation-helper';

const WatchdogDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <NavigationHelper />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Watchdog Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time monitoring and AI behavior analysis
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WatchdogControlPanel />
        <AIConfidenceHeatmap />
      </div>
    </div>
  );
};

export default WatchdogDashboard;