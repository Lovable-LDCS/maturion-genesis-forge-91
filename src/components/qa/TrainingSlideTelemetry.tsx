import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

interface TelemetryEvent {
  id: string;
  event_type: string;
  organization_id: string;
  document_id?: string;
  metadata: any;
  created_at: string;
}

export const TrainingSlideTelemetry: React.FC = () => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const logTelemetryEvent = async (eventType: string, documentId?: string, metadata?: any) => {
    if (!currentOrganization?.id) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error } = await supabase
        .from('audit_trail')
        .insert({
          organization_id: currentOrganization.id,
          table_name: 'ai_documents',
          record_id: documentId || currentOrganization.id,
          action: eventType,
          changed_by: user?.id,
          change_reason: 'Training slide telemetry event',
          field_name: 'telemetry_event',
          new_value: JSON.stringify({
            event_type: eventType,
            organization_id: currentOrganization.id,
            document_id: documentId,
            ...metadata,
            timestamp: new Date().toISOString()
          })
        });

      if (error) {
        console.error('Telemetry logging error:', error);
      } else {
        console.log(`[Telemetry] Logged event: ${eventType}`);
        loadEvents(); // Refresh the events list
      }
    } catch (error) {
      console.error('Telemetry error:', error);
    }
  };

  const loadEvents = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('field_name', 'telemetry_event')
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const telemetryEvents = data?.map(row => ({
        id: row.id,
        event_type: JSON.parse(row.new_value || '{}').event_type || row.action,
        organization_id: row.organization_id,
        document_id: JSON.parse(row.new_value || '{}').document_id,
        metadata: JSON.parse(row.new_value || '{}'),
        created_at: row.changed_at
      })) || [];

      setEvents(telemetryEvents);
    } catch (error) {
      console.error('Error loading telemetry events:', error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentOrganization?.id]);

  const simulateEvents = async () => {
    setLoading(true);
    const testDocumentId = crypto.randomUUID();
    
    try {
      // Simulate the complete training slide processing pipeline
      await logTelemetryEvent('upload_accepted', testDocumentId, {
        file_name: 'Processing_Equipment_Training.pptm',
        stage: 'processing',
        layer: 3,
        doc_type: 'training_slide'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await logTelemetryEvent('pptm_extracted', testDocumentId, {
        slide_count: 15,
        extraction_method: 'pptx-to-text',
        equipment_detected: ['dms-cyclone', 'xrt-sorter']
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await logTelemetryEvent('chunks_created', testDocumentId, {
        chunks_count: 8,
        chunks_with_equipment: 5,
        equipment_slugs: ['dms-cyclone', 'xrt-sorter', 'crusher-jaw']
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await logTelemetryEvent('doc_completed', testDocumentId, {
        total_chunks: 8,
        processing_time_ms: 12500,
        layer: 3,
        stage: 'processing'
      });

      toast({
        title: "Telemetry Simulation Complete",
        description: "Generated sample training slide processing events"
      });
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: "Could not generate telemetry events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Training Slide Telemetry
          </CardTitle>
          <Button 
            onClick={simulateEvents} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Simulating...' : 'Simulate Events'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No telemetry events recorded yet
            </div>
          ) : (
            events.map((event) => {
              const getEventConfig = (eventType: string) => {
                switch (eventType) {
                  case 'upload_accepted':
                    return { 
                      icon: <CheckCircle className="h-4 w-4 text-green-500" />, 
                      color: 'bg-green-50 border-green-200',
                      title: 'Upload Accepted'
                    };
                  case 'pptm_extracted':
                    return { 
                      icon: <GraduationCap className="h-4 w-4 text-purple-500" />, 
                      color: 'bg-purple-50 border-purple-200',
                      title: 'PPTM Extracted'
                    };
                  case 'chunks_created':
                    return { 
                      icon: <Activity className="h-4 w-4 text-blue-500" />, 
                      color: 'bg-blue-50 border-blue-200',
                      title: 'Chunks Created'
                    };
                  case 'doc_completed':
                    return { 
                      icon: <CheckCircle className="h-4 w-4 text-green-500" />, 
                      color: 'bg-green-50 border-green-200',
                      title: 'Document Completed'
                    };
                  default:
                    return { 
                      icon: <XCircle className="h-4 w-4 text-gray-500" />, 
                      color: 'bg-gray-50 border-gray-200',
                      title: eventType
                    };
                }
              };

              const config = getEventConfig(event.event_type);
              
              return (
                <div key={event.id} className={`p-3 rounded-md border ${config.color}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="font-medium text-sm">{config.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Event-specific metadata display */}
                  <div className="mt-2 space-y-1">
                    {event.metadata.file_name && (
                      <div className="text-xs text-muted-foreground">
                        File: {event.metadata.file_name}
                      </div>
                    )}
                    {event.metadata.stage && (
                      <Badge variant="outline" className="mr-1">
                        Stage: {event.metadata.stage}
                      </Badge>
                    )}
                    {event.metadata.layer && (
                      <Badge variant="outline" className="mr-1">
                        Layer {event.metadata.layer}
                      </Badge>
                    )}
                    {event.metadata.slide_count && (
                      <div className="text-xs text-muted-foreground">
                        Slides: {event.metadata.slide_count}
                      </div>
                    )}
                    {event.metadata.chunks_count && (
                      <div className="text-xs text-muted-foreground">
                        Chunks: {event.metadata.chunks_count}
                      </div>
                    )}
                    {event.metadata.equipment_detected?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {event.metadata.equipment_detected.map((eq: string) => (
                          <Badge key={eq} variant="secondary" className="text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {event.metadata.equipment_slugs?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {event.metadata.equipment_slugs.map((eq: string) => (
                          <Badge key={eq} variant="secondary" className="text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};