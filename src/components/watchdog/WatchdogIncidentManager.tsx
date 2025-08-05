import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Shield, Bug, Database, Settings, Plus, Eye, Edit } from 'lucide-react';

interface WatchdogIncident {
  id: string;
  incident_type: string;
  severity_level: string;
  title: string;
  description: string;
  status: string;
  escalation_level: number;
  resolution_notes: string;
  created_at: string;
  updated_at: string;
  resolved_at: string;
  affected_entities: any;
}

interface WatchdogIncidentManagerProps {
  organizationId?: string;
}

export const WatchdogIncidentManager: React.FC<WatchdogIncidentManagerProps> = ({ organizationId }) => {
  const [incidents, setIncidents] = useState<WatchdogIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<WatchdogIncident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (organizationId) {
      loadIncidents();
    }
  }, [organizationId]);

  const loadIncidents = async () => {
    if (!organizationId) return;

    try {
      const { data } = await supabase
        .from('watchdog_incidents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      setIncidents(data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateIncidentStatus = async (incidentId: string, status: string, notes?: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.resolution_notes = notes;
      }

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      await supabase
        .from('watchdog_incidents')
        .update(updateData)
        .eq('id', incidentId);

      loadIncidents();
      setSelectedIncident(null);
      setResolutionNotes('');
      setNewStatus('');
    } catch (error) {
      console.error('Error updating incident:', error);
    }
  };

  const escalateIncident = async (incidentId: string) => {
    try {
      const incident = incidents.find(i => i.id === incidentId);
      if (!incident) return;

      await supabase
        .from('watchdog_incidents')
        .update({ 
          escalation_level: incident.escalation_level + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      // Create alert for escalation
      await supabase
        .from('watchdog_alerts')
        .insert({
          organization_id: organizationId,
          alert_type: 'security_incident',
          severity_level: 'critical',
          title: `Incident Escalated: ${incident.title}`,
          message: `Incident has been escalated to level ${incident.escalation_level + 1}`,
          actionable_guidance: 'Immediate attention required for escalated incident',
          related_incident_id: incidentId
        });

      loadIncidents();
    } catch (error) {
      console.error('Error escalating incident:', error);
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'security_breach': return <Shield className="h-4 w-4" />;
      case 'data_corruption': return <Database className="h-4 w-4" />;
      case 'ai_malfunction': return <Bug className="h-4 w-4" />;
      case 'system_failure': return <Settings className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Incident Manager
          <Badge variant="outline">
            {incidents.filter(i => i.status === 'open' || i.status === 'investigating').length} Active
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage and track security incidents and system failures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {incidents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No incidents found
            </p>
          ) : (
            incidents.map((incident) => (
              <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIncidentIcon(incident.incident_type)}
                    <span className="font-medium">{incident.title}</span>
                    <Badge className={getSeverityColor(incident.severity_level)}>
                      {incident.severity_level}
                    </Badge>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                    {incident.escalation_level > 1 && (
                      <Badge variant="outline" className="text-red-600">
                        L{incident.escalation_level}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(incident.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{incident.description}</p>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setSelectedIncident(incident)}>
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {getIncidentIcon(incident.incident_type)}
                          {incident.title}
                        </DialogTitle>
                        <DialogDescription>
                          Incident #{incident.id.slice(0, 8)} • {incident.incident_type.replace('_', ' ')}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground">{incident.description}</p>
                        </div>

                        {incident.affected_entities && Object.keys(incident.affected_entities).length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Affected Entities</h4>
                            <pre className="text-xs bg-muted p-2 rounded">
                              {JSON.stringify(incident.affected_entities, null, 2)}
                            </pre>
                          </div>
                        )}

                        {incident.resolution_notes && (
                          <div>
                            <h4 className="font-medium mb-2">Resolution Notes</h4>
                            <p className="text-sm text-muted-foreground">{incident.resolution_notes}</p>
                          </div>
                        )}

                        {(incident.status === 'open' || incident.status === 'investigating') && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">Update Status</label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="investigating">Investigating</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Resolution Notes</label>
                              <Textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Add resolution notes..."
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                onClick={() => updateIncidentStatus(incident.id, newStatus, resolutionNotes)}
                                disabled={!newStatus}
                              >
                                Update Status
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => escalateIncident(incident.id)}
                              >
                                Escalate
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {(incident.status === 'open' || incident.status === 'investigating') && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                        disabled={incident.status === 'investigating'}
                      >
                        Start Investigation
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => escalateIncident(incident.id)}
                      >
                        Escalate
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};