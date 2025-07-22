import { supabase } from '@/integrations/supabase/client'

/**
 * Utility functions for managing seed data in external_insights table
 * Used for pilot rollout preparation
 */

export interface SeedDataSummary {
  totalRecords: number
  bySource: Record<string, number>
  byScope: Record<string, number>
  oldestRecord: string | null
  newestRecord: string | null
}

/**
 * Get summary of current seed data in external_insights
 */
export const getSeedDataSummary = async (): Promise<SeedDataSummary> => {
  try {
    const { data: insights, error } = await supabase
      .from('external_insights')
      .select('source_type, visibility_scope, created_at')
      .order('created_at', { ascending: true })

    if (error) throw error

    const summary: SeedDataSummary = {
      totalRecords: insights?.length || 0,
      bySource: {},
      byScope: {},
      oldestRecord: insights?.[0]?.created_at || null,
      newestRecord: insights?.[insights.length - 1]?.created_at || null
    }

    insights?.forEach(insight => {
      // Count by source type
      summary.bySource[insight.source_type] = (summary.bySource[insight.source_type] || 0) + 1
      
      // Count by visibility scope
      summary.byScope[insight.visibility_scope] = (summary.byScope[insight.visibility_scope] || 0) + 1
    })

    return summary
  } catch (error) {
    console.error('Error getting seed data summary:', error)
    throw error
  }
}

/**
 * Archive seed data by marking with special tags
 * (preserves data for reference while marking as test data)
 */
export const archiveSeedData = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('external_insights')
      .update({
        threat_tags: ['SEED_DATA', 'ARCHIVED'],
        summary: '[ARCHIVED SEED DATA] ' + supabase.from('external_insights').select('summary').single()
      })
      .is('source_url', null) // Only archive records without source URLs (likely seed data)
      .select('id')

    if (error) throw error

    return data?.length || 0
  } catch (error) {
    console.error('Error archiving seed data:', error)
    throw error
  }
}

/**
 * Complete removal of seed data (use with caution)
 */
export const removeSeedData = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('external_insights')
      .delete()
      .is('source_url', null) // Only remove records without source URLs
      .select('id')

    if (error) throw error

    return data?.length || 0
  } catch (error) {
    console.error('Error removing seed data:', error)
    throw error
  }
}

/**
 * Reset external_insights table for production rollout
 * Removes all current data and prepares for real threat feeds
 */
export const resetForProduction = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('external_insights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error) throw error

    console.log('External insights table reset for production')
  } catch (error) {
    console.error('Error resetting for production:', error)
    throw error
  }
}