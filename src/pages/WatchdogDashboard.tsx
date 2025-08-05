import React from 'react';
import { WatchdogControlPanel } from '@/components/watchdog';
import { NavigationHelper } from '@/components/ui/navigation-helper';

const WatchdogDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <NavigationHelper />
      <WatchdogControlPanel />
    </div>
  );
};

export default WatchdogDashboard;