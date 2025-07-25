import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface RejectionPattern {
  id: string;
  pattern: string;
  frequency: number;
  sectors: string[];
  domains: string[];
  reasons: string[];
  confidence: number;
  isActive: boolean;
  lastUpdated: string;
}

interface SectorLearning {
  sector: string;
  rejectedPhrases: string[];
  preferredPhrases: string[];
  contextualRules: string[];
}

export const useSmartFeedbackLoop = () => {
  const [rejectionPatterns, setRejectionPatterns] = useState<RejectionPattern[]>([]);
  const [sectorLearning, setSectorLearning] = useState<SectorLearning[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  // Analyze rejection patterns and build learning model
  const analyzeRejectionPatterns = async (): Promise<RejectionPattern[]> => {
    if (!currentOrganization?.id) return [];

    setIsAnalyzing(true);

    try {
      // Query recent feedback entries
      const { data: feedbackEntries, error } = await supabase
        .from('ai_feedback_log')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by rejection patterns
      const patternMap = new Map<string, any>();

      feedbackEntries?.forEach(feedback => {
        const keyPhrases = extractKeyPhrases(feedback.rejected_text);
        
        keyPhrases.forEach(phrase => {
          const key = phrase.toLowerCase().trim();
          
          if (patternMap.has(key)) {
            const existing = patternMap.get(key);
            existing.frequency += 1;
            existing.reasons.add(feedback.reason);
            existing.entries.push(feedback);
          } else {
            patternMap.set(key, {
              pattern: phrase,
              frequency: 1,
              reasons: new Set([feedback.reason]),
              entries: [feedback],
              sectors: new Set(),
              domains: new Set()
            });
          }
        });
      });

      // Convert to rejection patterns with metadata
      const patterns: RejectionPattern[] = Array.from(patternMap.values())
        .filter(p => p.frequency >= 2) // Only patterns with 2+ occurrences
        .map(p => {
          // Extract sectors and domains from organization metadata
          const sectors = currentOrganization.industry_tags || [];
          const domains = [...p.entries.map((e: any) => e.domain_id)].filter(Boolean);

          return {
            id: generatePatternId(p.pattern),
            pattern: p.pattern,
            frequency: p.frequency,
            sectors: sectors,
            domains: [...new Set(domains)],
            reasons: Array.from(p.reasons) as string[],
            confidence: calculateConfidence(p.frequency, p.entries.length),
            isActive: true,
            lastUpdated: new Date().toISOString()
          };
        })
        .sort((a, b) => b.frequency - a.frequency);

      setRejectionPatterns(patterns);

      // Update learning model for future suggestions
      await updateLearningModel(patterns);

      return patterns;
    } catch (error) {
      console.error('Error analyzing rejection patterns:', error);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Build sector-specific learning rules
  const buildSectorLearning = async (): Promise<void> => {
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('industry_tags, region_operating')
        .eq('id', currentOrganization?.id)
        .single();

      if (!orgData?.industry_tags) return;

      const sectorRules: SectorLearning[] = [];

      for (const sector of orgData.industry_tags) {
        // Query feedback specific to this sector context
        const sectorFeedback = await getSectorSpecificFeedback(sector);
        
        const rejectedPhrases = extractRejectedPhrases(sectorFeedback);
        const preferredPhrases = extractPreferredPhrases(sectorFeedback);
        const contextualRules = generateContextualRules(sector, sectorFeedback);

        sectorRules.push({
          sector,
          rejectedPhrases,
          preferredPhrases,
          contextualRules
        });
      }

      setSectorLearning(sectorRules);
    } catch (error) {
      console.error('Error building sector learning:', error);
    }
  };

  // Check if content should be modified based on learned patterns
  const applySmartFeedback = async (content: string, domainId?: string): Promise<{
    modifiedContent: string;
    suppressionApplied: boolean;
    modificationsApplied: string[];
    fallbackTraceability: string[];
  }> => {
    try {
      let modifiedContent = content;
      const modificationsApplied: string[] = [];
      const fallbackTraceability: string[] = [];
      let suppressionApplied = false;

      // Step 1: Check for rejection patterns
      for (const pattern of rejectionPatterns) {
        if (pattern.isActive && content.toLowerCase().includes(pattern.pattern.toLowerCase())) {
          // High confidence patterns trigger suppression
          if (pattern.confidence > 0.8 && pattern.frequency > 5) {
            suppressionApplied = true;
            fallbackTraceability.push(`Suppressed due to pattern: "${pattern.pattern}" (${pattern.frequency}x rejected)`);
            continue;
          }

          // Medium confidence patterns trigger modification
          if (pattern.confidence > 0.6) {
            const sectorRule = sectorLearning.find(s => 
              currentOrganization?.industry_tags?.includes(s.sector)
            );
            
            if (sectorRule) {
              const replacement = findPreferredReplacement(pattern.pattern, sectorRule);
              if (replacement) {
                modifiedContent = modifiedContent.replace(
                  new RegExp(pattern.pattern, 'gi'), 
                  replacement
                );
                modificationsApplied.push(`"${pattern.pattern}" → "${replacement}"`);
                fallbackTraceability.push(`Modified using ${sectorRule.sector} sector learning`);
              }
            }
          }
        }
      }

      // Step 2: Apply sector-specific preferences
      for (const sectorRule of sectorLearning) {
        if (currentOrganization?.industry_tags?.includes(sectorRule.sector)) {
          for (const rejectedPhrase of sectorRule.rejectedPhrases) {
            if (modifiedContent.toLowerCase().includes(rejectedPhrase.toLowerCase())) {
              const preferredAlternative = sectorRule.preferredPhrases.find(p => 
                p.toLowerCase().includes(rejectedPhrase.split(' ')[0].toLowerCase())
              );
              
              if (preferredAlternative) {
                modifiedContent = modifiedContent.replace(
                  new RegExp(rejectedPhrase, 'gi'),
                  preferredAlternative
                );
                modificationsApplied.push(`Applied ${sectorRule.sector} preference`);
                fallbackTraceability.push(`Sector learning: ${sectorRule.sector}`);
              }
            }
          }
        }
      }

      return {
        modifiedContent,
        suppressionApplied,
        modificationsApplied,
        fallbackTraceability
      };
    } catch (error) {
      console.error('Error applying smart feedback:', error);
      return {
        modifiedContent: content,
        suppressionApplied: false,
        modificationsApplied: [],
        fallbackTraceability: []
      };
    }
  };

  // Update the AI learning model with new patterns
  const updateLearningModel = async (patterns: RejectionPattern[]): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('ai_upload_audit')
        .insert({
          organization_id: currentOrganization?.id || '',
          user_id: user?.id || '',
          action: 'learning_model_update',
          metadata: {
            patterns_count: patterns.length,
            high_confidence_patterns: patterns.filter(p => p.confidence > 0.8).length,
            sectors_affected: [...new Set(patterns.flatMap(p => p.sectors))],
            update_timestamp: new Date().toISOString()
          }
        });

      console.log('Learning model updated with', patterns.length, 'patterns');
    } catch (error) {
      console.warn('Failed to log learning model update:', error);
    }
  };

  // Initialize learning on hook mount
  useEffect(() => {
    if (currentOrganization?.id) {
      analyzeRejectionPatterns();
      buildSectorLearning();
    }
  }, [currentOrganization?.id]);

  return {
    rejectionPatterns,
    sectorLearning,
    isAnalyzing,
    analyzeRejectionPatterns,
    buildSectorLearning,
    applySmartFeedback
  };
};

// Helper functions
function extractKeyPhrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const phrases: string[] = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words.slice(i, i + 2).join(' '));
    if (i < words.length - 2) {
      phrases.push(words.slice(i, i + 3).join(' '));
    }
  }
  
  return phrases.filter(phrase => 
    phrase.length > 5 && 
    !phrase.includes('the ') && 
    !phrase.includes('and ') &&
    !phrase.includes('for ')
  );
}

function generatePatternId(pattern: string): string {
  return pattern.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function calculateConfidence(frequency: number, totalEntries: number): number {
  const baseConfidence = Math.min(frequency / 10, 0.8);
  const consistencyBonus = frequency === totalEntries ? 0.2 : 0;
  return Math.min(baseConfidence + consistencyBonus, 1.0);
}

async function getSectorSpecificFeedback(sector: string): Promise<any[]> {
  // This would query feedback entries filtered by sector context
  // For now, return empty array as placeholder
  return [];
}

function extractRejectedPhrases(feedback: any[]): string[] {
  return feedback.map(f => f.rejected_text).filter(Boolean);
}

function extractPreferredPhrases(feedback: any[]): string[] {
  return feedback.map(f => f.replacement_text).filter(Boolean);
}

function generateContextualRules(sector: string, feedback: any[]): string[] {
  // Generate sector-specific rules based on feedback patterns
  const rules = [];
  
  switch (sector.toLowerCase()) {
    case 'heavy equipment':
      rules.push('Prefer "operational security" over "cyber security"');
      rules.push('Use "equipment maintenance" instead of "asset management"');
      break;
    case 'mining':
      rules.push('Emphasize "regulatory compliance" over "best practices"');
      rules.push('Avoid "real-time monitoring" terminology');
      break;
    default:
      rules.push('Use industry-standard terminology');
  }
  
  return rules;
}

function findPreferredReplacement(rejectedPhrase: string, sectorRule: SectorLearning): string | null {
  // Find sector-appropriate replacement for rejected phrase
  return sectorRule.preferredPhrases.find(p => 
    p.toLowerCase().includes(rejectedPhrase.split(' ')[0].toLowerCase())
  ) || null;
}