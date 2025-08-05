import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Shield, 
  Eye, 
  Upload, 
  Settings, 
  Target,
  Activity
} from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  adminOnly?: boolean;
  highlight?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: Target,
    description: 'Main overview and quick actions'
  },
  {
    name: 'QA Dashboard',
    path: '/qa-dashboard',
    icon: BarChart,
    description: 'Quality assurance monitoring and testing',
    adminOnly: true,
    highlight: true
  },
  {
    name: 'Watchdog Control',
    path: '/watchdog',
    icon: Shield,
    description: 'AI intelligence and system surveillance',
    badge: 'NEW',
    adminOnly: true,
    highlight: true
  },
  {
    name: 'Document Uploads',
    path: '/maturion/uploads',
    icon: Upload,
    description: 'Upload and manage knowledge documents'
  },
  {
    name: 'Knowledge Base',
    path: '/maturion/knowledge-base',
    icon: Eye,
    description: 'Browse uploaded documents and AI knowledge'
  },
  {
    name: 'Admin Config',
    path: '/admin/config',
    icon: Settings,
    description: 'System configuration and management',
    adminOnly: true
  }
];

export const NavigationHelper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdminAccess();

  const filteredItems = NAVIGATION_ITEMS.filter(item => 
    !item.adminOnly || isAdmin
  );

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
      <div className="w-full mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Quick Navigation</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Navigate between key areas of the Maturion platform
        </p>
      </div>
      
      {filteredItems.map((item) => {
        const isActive = location.pathname === item.path;
        const IconComponent = item.icon;
        
        return (
          <Button
            key={item.path}
            variant={isActive ? "default" : item.highlight ? "secondary" : "outline"}
            size="sm"
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-2 ${item.highlight ? 'border-primary/50' : ''}`}
            title={item.description}
          >
            <IconComponent className="h-4 w-4" />
            <span>{item.name}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {item.badge}
              </Badge>
            )}
            {isActive && (
              <div className="w-1 h-1 bg-primary rounded-full ml-1" />
            )}
          </Button>
        );
      })}
    </div>
  );
};