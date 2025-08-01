import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadMetrics {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  processingTimeMs: number;
  totalSizeBytes: number;
}

interface UploadSession {
  sessionId: string;
  organizationId: string;
  userId: string;
  startedAt: Date;
  metrics: UploadMetrics;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface UseUnifiedUploadReturn {
  currentSession: UploadSession | null;
  isProcessing: boolean;
  createSession: () => UploadSession;
  updateSessionMetrics: (metrics: Partial<UploadMetrics>) => void;
  completeSession: () => Promise<void>;
  getRecentSessions: () => Promise<UploadSession[]>;
  getQAMetrics: (timeRange?: 'hour' | 'day' | 'week') => Promise<any[]>;
}

export const useUnifiedUpload = (): UseUnifiedUploadReturn => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createSession = useCallback((): UploadSession => {
    if (!user || !currentOrganization) {
      throw new Error('User and organization required to create upload session');
    }

    const session: UploadSession = {
      sessionId: crypto.randomUUID(),
      organizationId: currentOrganization.id,
      userId: user.id,
      startedAt: new Date(),
      metrics: {
        totalFiles: 0,
        successCount: 0,
        failureCount: 0,
        processingTimeMs: 0,
        totalSizeBytes: 0
      },
      status: 'pending'
    };

    setCurrentSession(session);
    return session;
  }, [user, currentOrganization]);

  const updateSessionMetrics = useCallback((metrics: Partial<UploadMetrics>) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          ...metrics
        }
      };
    });
  }, []);

  const completeSession = useCallback(async () => {
    if (!currentSession) return;

    setIsProcessing(true);
    
    try {
      const completedAt = new Date();
      const processingTimeMs = completedAt.getTime() - currentSession.startedAt.getTime();

      // Update session in database
      const { error } = await supabase
        .from('upload_session_log')
        .update({
          completed_at: completedAt.toISOString(),
          success_count: currentSession.metrics.successCount,
          failure_count: currentSession.metrics.failureCount,
          session_data: {
            ...currentSession.metrics,
            processingTimeMs,
            status: 'completed'
          }
        })
        .eq('session_id', currentSession.sessionId);

      if (error) {
        console.error('Failed to update session log:', error);
        throw error;
      }

      // Log completion metrics
      await supabase.from('qa_metrics').insert([
        {
          organization_id: currentSession.organizationId,
          metric_type: 'upload_session_completed',
          metric_value: 1,
          metric_data: {
            sessionId: currentSession.sessionId,
            filesProcessed: currentSession.metrics.totalFiles,
            successRate: currentSession.metrics.totalFiles > 0 
              ? (currentSession.metrics.successCount / currentSession.metrics.totalFiles) * 100 
              : 0,
            processingTimeMs
          }
        },
        {
          organization_id: currentSession.organizationId,
          metric_type: 'upload_success_rate',
          metric_value: currentSession.metrics.totalFiles > 0 
            ? (currentSession.metrics.successCount / currentSession.metrics.totalFiles) * 100 
            : 0,
          metric_data: {
            sessionId: currentSession.sessionId,
            totalFiles: currentSession.metrics.totalFiles,
            successCount: currentSession.metrics.successCount,
            failureCount: currentSession.metrics.failureCount
          }
        }
      ]);

      setCurrentSession(prev => prev ? { ...prev, status: 'completed' } : null);

      toast({
        title: "Upload session completed",
        description: `${currentSession.metrics.successCount} files processed successfully`,
      });

    } catch (error) {
      console.error('Error completing session:', error);
      setCurrentSession(prev => prev ? { ...prev, status: 'failed' } : null);
      
      toast({
        title: "Session completion failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentSession, toast]);

  const getRecentSessions = useCallback(async (): Promise<UploadSession[]> => {
    if (!currentOrganization) return [];

    try {
      const { data, error } = await supabase
        .from('upload_session_log')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      return data.map(session => ({
        sessionId: session.session_id,
        organizationId: session.organization_id,
        userId: session.user_id,
        startedAt: new Date(session.started_at),
        metrics: {
          totalFiles: session.document_count || 0,
          successCount: session.success_count || 0,
          failureCount: session.failure_count || 0,
          processingTimeMs: (session.session_data as any)?.processingTimeMs || 0,
          totalSizeBytes: session.total_size_bytes || 0
        },
        status: session.completed_at ? 'completed' : 'pending'
      }));

    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      return [];
    }
  }, [currentOrganization]);

  const getQAMetrics = useCallback(async (timeRange: 'hour' | 'day' | 'week' = 'day') => {
    if (!currentOrganization) return [];

    const now = new Date();
    const timeRanges = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    };

    try {
      const { data, error } = await supabase
        .from('qa_metrics')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .gte('recorded_at', timeRanges[timeRange].toISOString())
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('Error fetching QA metrics:', error);
        return [];
      }

      return data;

    } catch (error) {
      console.error('Error fetching QA metrics:', error);
      return [];
    }
  }, [currentOrganization]);

  return {
    currentSession,
    isProcessing,
    createSession,
    updateSessionMetrics,
    completeSession,
    getRecentSessions,
    getQAMetrics
  };
};