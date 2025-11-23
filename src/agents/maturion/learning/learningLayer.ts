/**
 * Maturion Self-Learning Layer (Human-in-the-Loop)
 * NOT autonomous self-training
 * Stores anonymized interaction patterns and suggests improvements for developer approval
 */

import { supabase } from '@/integrations/supabase/client';

export interface LearningPattern {
  id: string;
  patternType: 'query_improvement' | 'tool_suggestion' | 'response_quality' | 'gap_identified';
  description: string;
  occurrenceCount: number;
  suggestedImprovement: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface InteractionFeedback {
  interactionId: string;
  helpful: boolean;
  rating?: number; // 1-5
  comment?: string;
  userId: string;
  timestamp: Date;
}

/**
 * Records an interaction pattern for learning
 */
export async function recordLearningPattern(
  pattern: Omit<LearningPattern, 'id' | 'createdAt' | 'status' | 'occurrenceCount'>
): Promise<void> {
  try {
    // Check if similar pattern already exists
    const { data: existing } = await supabase
      .from('ai_learning_patterns')
      .select('*')
      .eq('pattern_type', pattern.patternType)
      .ilike('description', `%${pattern.description}%`)
      .single();

    if (existing) {
      // Increment occurrence count
      await supabase
        .from('ai_learning_patterns')
        .update({ occurrence_count: (existing.occurrence_count || 0) + 1 })
        .eq('id', existing.id);
    } else {
      // Create new pattern
      await supabase.from('ai_learning_patterns').insert({
        pattern_type: pattern.patternType,
        description: pattern.description,
        suggested_improvement: pattern.suggestedImprovement,
        status: 'pending',
        occurrence_count: 1,
      });
    }

    console.log('[Maturion Learning] Pattern recorded:', pattern.patternType);
  } catch (error) {
    console.error('[Maturion Learning] Failed to record pattern:', error);
  }
}

/**
 * Records user feedback on an interaction
 */
export async function recordInteractionFeedback(
  feedback: InteractionFeedback
): Promise<void> {
  try {
    await supabase.from('ai_feedback_submissions').insert({
      interaction_id: feedback.interactionId,
      helpful: feedback.helpful,
      rating: feedback.rating,
      comment: feedback.comment,
      user_id: feedback.userId,
      timestamp: feedback.timestamp,
    });

    console.log('[Maturion Learning] Feedback recorded:', feedback.helpful ? 'helpful' : 'not helpful');

    // If feedback is negative, create a learning pattern
    if (!feedback.helpful || (feedback.rating && feedback.rating < 3)) {
      await recordLearningPattern({
        patternType: 'response_quality',
        description: `Low-quality response detected (rating: ${feedback.rating || 'N/A'})`,
        suggestedImprovement: feedback.comment || 'Improve response relevance and accuracy',
      });
    }
  } catch (error) {
    console.error('[Maturion Learning] Failed to record feedback:', error);
  }
}

/**
 * Retrieves pending learning patterns for developer review
 */
export async function getPendingLearningPatterns(): Promise<LearningPattern[]> {
  try {
    const { data, error } = await supabase
      .from('ai_learning_patterns')
      .select('*')
      .eq('status', 'pending')
      .order('occurrence_count', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map((row: {
      id: string;
      pattern_type: string;
      description: string;
      suggested_improvement: string;
      status: string;
      occurrence_count: number;
      created_at: string;
      approved_by?: string;
      approved_at?: string;
    }) => ({
      id: row.id,
      patternType: row.pattern_type as LearningPattern['patternType'],
      description: row.description,
      suggestedImprovement: row.suggested_improvement,
      status: row.status as LearningPattern['status'],
      occurrenceCount: row.occurrence_count || 0,
      createdAt: new Date(row.created_at),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    }));
  } catch (error) {
    console.error('[Maturion Learning] Failed to fetch patterns:', error);
    return [];
  }
}

/**
 * Approves a learning pattern (developer action)
 */
export async function approveLearningPattern(
  patternId: string,
  approverId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_learning_patterns')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', patternId);

    if (error) throw error;

    console.log('[Maturion Learning] Pattern approved:', patternId);
    return true;
  } catch (error) {
    console.error('[Maturion Learning] Failed to approve pattern:', error);
    return false;
  }
}

/**
 * Rejects a learning pattern (developer action)
 */
export async function rejectLearningPattern(
  patternId: string,
  reason?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_learning_patterns')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', patternId);

    if (error) throw error;

    console.log('[Maturion Learning] Pattern rejected:', patternId);
    return true;
  } catch (error) {
    console.error('[Maturion Learning] Failed to reject pattern:', error);
    return false;
  }
}

/**
 * Analyzes interactions to identify improvement opportunities
 */
export async function analyzeFeedbackPatterns(
  organizationId: string
): Promise<{
  totalInteractions: number;
  helpfulRate: number;
  averageRating: number;
  commonIssues: string[];
  improvementSuggestions: string[];
}> {
  try {
    const { data: feedback } = await supabase
      .from('ai_feedback_submissions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (!feedback || feedback.length === 0) {
      return {
        totalInteractions: 0,
        helpfulRate: 0,
        averageRating: 0,
        commonIssues: [],
        improvementSuggestions: [],
      };
    }

    const totalInteractions = feedback.length;
    const helpfulCount = feedback.filter((f: {helpful: boolean}) => f.helpful).length;
    const helpfulRate = (helpfulCount / totalInteractions) * 100;

    const ratingsWithValue = feedback.filter((f: {rating?: number}) => f.rating != null);
    const averageRating =
      ratingsWithValue.length > 0
        ? ratingsWithValue.reduce((sum: number, f: {rating?: number}) => sum + (f.rating || 0), 0) / ratingsWithValue.length
        : 0;

    // Extract common issues from negative feedback
    const negativeComments = feedback
      .filter((f: {helpful: boolean; rating?: number}) => !f.helpful || (f.rating && f.rating < 3))
      .map((f: {comment?: string}) => f.comment)
      .filter((c): c is string => !!c);

    const commonIssues = Array.from(new Set(negativeComments)).slice(0, 5);

    return {
      totalInteractions,
      helpfulRate,
      averageRating,
      commonIssues,
      improvementSuggestions: [
        helpfulRate < 70 ? 'Improve response relevance and accuracy' : '',
        averageRating < 3.5 ? 'Enhance answer quality and depth' : '',
        commonIssues.length > 0 ? 'Address recurring user concerns' : '',
      ].filter(Boolean),
    };
  } catch (error) {
    console.error('[Maturion Learning] Failed to analyze patterns:', error);
    return {
      totalInteractions: 0,
      helpfulRate: 0,
      averageRating: 0,
      commonIssues: [],
      improvementSuggestions: [],
    };
  }
}

/**
 * Auto-ingest new knowledge base documents
 */
export async function autoIngestKnowledgeBase(
  organizationId: string
): Promise<{ documentsProcessed: number; newDocuments: number }> {
  try {
    // Find unprocessed documents
    const { data: newDocuments } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'pending');

    if (!newDocuments || newDocuments.length === 0) {
      return { documentsProcessed: 0, newDocuments: 0 };
    }

    console.log(`[Maturion Learning] Auto-ingesting ${newDocuments.length} new documents`);

    // Process each document
    let processed = 0;
    for (const doc of newDocuments) {
      try {
        // Call document processing function
        await supabase.functions.invoke('process-document-v2', {
          body: { documentId: doc.id },
        });
        processed++;
      } catch (error) {
        console.error(`[Maturion Learning] Failed to process document ${doc.id}:`, error);
      }
    }

    return {
      documentsProcessed: processed,
      newDocuments: newDocuments.length,
    };
  } catch (error) {
    console.error('[Maturion Learning] Auto-ingestion failed:', error);
    return { documentsProcessed: 0, newDocuments: 0 };
  }
}
