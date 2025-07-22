
import { useCallback } from 'react';

export const useMPSValidation = () => {
  const validateDomainMPSs = useCallback((domainName: string, mpsList: any[]) => {
    const warnings: string[] = [];
    
    // Domain-specific validation rules
    const domainRules = {
      'Leadership & Governance': { expectedRange: [1, 2, 3, 4, 5] },
      'Process Integrity': { expectedRange: [6, 7, 8, 9, 10] },
      'People & Culture': { expectedRange: [11, 12, 13, 14] },
      'Protection': { expectedRange: [15, 16, 17, 18, 19, 20] },
      'Proof it Works': { expectedRange: [21, 22, 23, 24, 25] }
    };

    const rules = domainRules[domainName as keyof typeof domainRules];
    if (!rules) return warnings;

    const foundNumbers = mpsList.map(mps => parseInt(mps.number || mps.mps_number)).filter(num => !isNaN(num));
    const expectedNumbers = rules.expectedRange;

    // Check for missing MPSs
    const missingNumbers = expectedNumbers.filter(num => !foundNumbers.includes(num));
    if (missingNumbers.length > 0) {
      warnings.push(`Missing expected MPSs: ${missingNumbers.join(', ')}`);
    }

    // Check for unexpected MPSs
    const unexpectedNumbers = foundNumbers.filter(num => !expectedNumbers.includes(num));
    if (unexpectedNumbers.length > 0) {
      warnings.push(`Unexpected MPSs found: ${unexpectedNumbers.join(', ')} (should be ${expectedNumbers.join('-')} for ${domainName})`);
    }

    // Check for duplicates
    const duplicates = foundNumbers.filter((num, index) => foundNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate MPS numbers found: ${duplicates.join(', ')}`);
    }

    return warnings;
  }, []);

  return { validateDomainMPSs };
};
