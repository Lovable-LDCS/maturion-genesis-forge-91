import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Activity, Search, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLogEntry {
  id: string;
  admin_user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address?: unknown;
  user_agent?: string;
  created_at: string;
}

export const AdminActivityLog = () => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin_activity_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_log'
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const filteredActivities = activities.filter(activity =>
    activity.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (activity.details && JSON.stringify(activity.details).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div>Loading activity log...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Admin Activity Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredActivities.map((activity) => {
              const timestamp = formatTimestamp(activity.created_at);
              
              return (
                <Card key={activity.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant={getActionColor(activity.action_type)}>
                            {activity.action_type}
                          </Badge>
                          <span className="font-medium">{activity.entity_type}</span>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {timestamp.date} at {timestamp.time}
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1 mb-1">
                            <User className="h-3 w-3" />
                            User ID: {activity.admin_user_id}
                          </div>
                          <div>Entity ID: {activity.entity_id}</div>
                          {activity.ip_address && (
                            <div>IP: {String(activity.ip_address)}</div>
                          )}
                        </div>

                        {activity.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(activity.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {filteredActivities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No activities match your search.' : 'No activities recorded yet.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};