import React from 'react';
import { WatchdogControlPanel } from '@/components/watchdog';

const WatchdogDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <WatchdogControlPanel />
    </div>
  );
};

export default WatchdogDashboard;