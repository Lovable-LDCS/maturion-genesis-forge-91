/**
 * Maturion Maturity Scoring Logic
 * 
 * This module implements the scoring algorithm for both Free Assessment 
 * and Full Maturity Evaluation with the following rules:
 * 
 * 1. Target Level Threshold: 80% of criteria must be at or above target level
 * 2. Penalty for Two-Level Deficit: Any criteria two levels below target downgrades entire domain
 */

export type MaturityLevel = 'basic' | 'reactive' | 'compliant' | 'proactive' | 'resilient';

export const MATURITY_LEVELS: Record<MaturityLevel, { value: number; label: string }> = {
  basic: { value: 1, label: 'Basic' },
  reactive: { value: 2, label: 'Reactive' },
  compliant: { value: 3, label: 'Compliant' },
  proactive: { value: 4, label: 'Pro-active' },
  resilient: { value: 5, label: 'Resilient' }
};

export interface CriteriaScore {
  criteriaId: string;
  currentLevel: MaturityLevel;
  targetLevel: MaturityLevel;
  evidenceScore: number;
}

export interface DomainScore {
  domainId: string;
  domainName: string;
  criteriaScores: CriteriaScore[];
  calculatedLevel: MaturityLevel;
  targetLevel: MaturityLevel;
  meetsThreshold: boolean;
  penaltyApplied: boolean;
  percentageAtTarget: number;
}

/**
 * Calculate maturity level for a domain based on scoring rules
 */
export function calculateDomainMaturity(
  criteriaScores: CriteriaScore[],
  targetLevel: MaturityLevel
): {
  calculatedLevel: MaturityLevel;
  meetsThreshold: boolean;
  penaltyApplied: boolean;
  percentageAtTarget: number;
} {
  if (criteriaScores.length === 0) {
    return {
      calculatedLevel: 'basic',
      meetsThreshold: false,
      penaltyApplied: false,
      percentageAtTarget: 0
    };
  }

  const targetValue = MATURITY_LEVELS[targetLevel].value;
  
  // Check for two-level deficit penalty
  const hasTwoLevelDeficit = criteriaScores.some(score => {
    const currentValue = MATURITY_LEVELS[score.currentLevel].value;
    return currentValue <= targetValue - 2;
  });

  // Calculate percentage at or above target level
  const atTargetOrAbove = criteriaScores.filter(score => {
    const currentValue = MATURITY_LEVELS[score.currentLevel].value;
    return currentValue >= targetValue;
  }).length;

  const percentageAtTarget = (atTargetOrAbove / criteriaScores.length) * 100;

  // Check 80% threshold for at or above target level
  const meetsThreshold = percentageAtTarget >= 80;

  // Check if up to 20% can be one level below
  const oneLevelBelow = criteriaScores.filter(score => {
    const currentValue = MATURITY_LEVELS[score.currentLevel].value;
    return currentValue === targetValue - 1;
  }).length;

  const percentageOneLevelBelow = (oneLevelBelow / criteriaScores.length) * 100;
  const allowableOneLevelBelow = percentageOneLevelBelow <= 20;

  let calculatedLevel: MaturityLevel;
  let penaltyApplied = false;

  if (hasTwoLevelDeficit) {
    // Apply two-level deficit penalty - downgrade by one level
    const downgradeValue = Math.max(1, targetValue - 1);
    calculatedLevel = getMaturityLevelByValue(downgradeValue);
    penaltyApplied = true;
  } else if (meetsThreshold && allowableOneLevelBelow) {
    // Meets all criteria for target level
    calculatedLevel = targetLevel;
  } else {
    // Does not meet threshold - assign based on highest achievable level
    calculatedLevel = calculateAchievableLevel(criteriaScores);
  }

  return {
    calculatedLevel,
    meetsThreshold: meetsThreshold && allowableOneLevelBelow && !hasTwoLevelDeficit,
    penaltyApplied,
    percentageAtTarget
  };
}

/**
 * Calculate the highest achievable maturity level based on current scores
 */
function calculateAchievableLevel(criteriaScores: CriteriaScore[]): MaturityLevel {
  const levelCounts = {
    basic: 0,
    reactive: 0,
    compliant: 0,
    proactive: 0,
    resilient: 0
  };

  // Count occurrences of each level
  criteriaScores.forEach(score => {
    levelCounts[score.currentLevel]++;
  });

  const total = criteriaScores.length;

  // Check from highest to lowest level what can be achieved with 80% threshold
  for (let level = 5; level >= 1; level--) {
    const levelKey = getMaturityLevelByValue(level);
    const atOrAboveCount = criteriaScores.filter(score => 
      MATURITY_LEVELS[score.currentLevel].value >= level
    ).length;
    
    const percentage = (atOrAboveCount / total) * 100;
    
    if (percentage >= 80) {
      return levelKey;
    }
  }

  return 'basic';
}

/**
 * Get maturity level enum by numerical value
 */
function getMaturityLevelByValue(value: number): MaturityLevel {
  const level = Object.entries(MATURITY_LEVELS).find(([_, config]) => config.value === value);
  return level ? level[0] as MaturityLevel : 'basic';
}

/**
 * Shuffle array for randomizing question order
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate overall assessment progress
 */
export function calculateAssessmentProgress(domainScores: DomainScore[]): {
  totalCriteria: number;
  completedCriteria: number;
  completionPercentage: number;
  overallMaturityLevel: MaturityLevel;
} {
  const totalCriteria = domainScores.reduce((sum, domain) => 
    sum + domain.criteriaScores.length, 0);
  
  const completedCriteria = domainScores.reduce((sum, domain) => 
    sum + domain.criteriaScores.filter(criteria => 
      MATURITY_LEVELS[criteria.currentLevel].value > 1
    ).length, 0);

  const completionPercentage = totalCriteria > 0 ? 
    (completedCriteria / totalCriteria) * 100 : 0;

  // Calculate overall maturity as average of domain levels
  const totalMaturityValue = domainScores.reduce((sum, domain) => 
    sum + MATURITY_LEVELS[domain.calculatedLevel].value, 0);
  
  const averageMaturity = domainScores.length > 0 ? 
    Math.round(totalMaturityValue / domainScores.length) : 1;
  
  const overallMaturityLevel = getMaturityLevelByValue(Math.max(1, Math.min(5, averageMaturity)));

  return {
    totalCriteria,
    completedCriteria,
    completionPercentage,
    overallMaturityLevel
  };
}

/**
 * Validate scoring data for integrity
 */
export function validateScoringData(criteriaScores: CriteriaScore[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (criteriaScores.length === 0) {
    errors.push('No criteria scores provided');
  }

  criteriaScores.forEach((score, index) => {
    if (!score.criteriaId) {
      errors.push(`Criteria score ${index + 1}: Missing criteria ID`);
    }
    
    if (!MATURITY_LEVELS[score.currentLevel]) {
      errors.push(`Criteria score ${index + 1}: Invalid current level`);
    }
    
    if (!MATURITY_LEVELS[score.targetLevel]) {
      errors.push(`Criteria score ${index + 1}: Invalid target level`);
    }
    
    if (score.evidenceScore < 0 || score.evidenceScore > 100) {
      errors.push(`Criteria score ${index + 1}: Evidence score must be between 0-100`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}