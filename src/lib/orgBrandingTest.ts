/**
 * Organization Branding Smoke Test
 * Use this to verify the secure tenant-scoped logo system is working correctly
 */

import { uploadOrgLogo, getOrgLogoUrl, removeOrgLogo } from './orgBrandingService';

interface SmokeTestResult {
  success: boolean;
  steps: Array<{
    step: string;
    status: 'pass' | 'fail' | 'skip';
    message: string;
  }>;
  summary: string;
}

/**
 * Run a comprehensive smoke test of the organization branding system
 * @param orgId Organization ID to test with
 * @param testImageBlob Small test image blob (optional - will create one if not provided)
 * @returns Promise<SmokeTestResult>
 */
export async function runOrgBrandingSmokeTest(
  orgId: string, 
  testImageBlob?: Blob
): Promise<SmokeTestResult> {
  const results: SmokeTestResult = {
    success: false,
    steps: [],
    summary: ''
  };

  try {
    // Step 1: Create test image if not provided
    let testFile: File;
    if (testImageBlob) {
      testFile = new File([testImageBlob], 'test-logo.png', { type: 'image/png' });
    } else {
      // Create a minimal 1x1 PNG blob for testing
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 1, 1);
      }
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      testFile = new File([blob], 'test-logo.png', { type: 'image/png' });
    }

    results.steps.push({
      step: 'Create test image',
      status: 'pass',
      message: `Created test file: ${testFile.name} (${testFile.size} bytes)`
    });

    // Step 2: Upload logo
    const uploadResult = await uploadOrgLogo(orgId, testFile);
    if (uploadResult.success) {
      results.steps.push({
        step: 'Upload logo',
        status: 'pass',
        message: `Logo uploaded to path: ${uploadResult.objectPath}`
      });
    } else {
      results.steps.push({
        step: 'Upload logo',
        status: 'fail',
        message: uploadResult.error || 'Upload failed'
      });
      results.summary = 'Upload test failed';
      return results;
    }

    // Step 3: Retrieve signed URL
    const urlResult = await getOrgLogoUrl(orgId);
    if (urlResult.success && urlResult.signedUrl) {
      results.steps.push({
        step: 'Get signed URL',
        status: 'pass',
        message: `Signed URL created (expires in 1 hour): ${urlResult.signedUrl.substring(0, 50)}...`
      });
    } else {
      results.steps.push({
        step: 'Get signed URL',
        status: 'fail',
        message: urlResult.error || 'Failed to get signed URL'
      });
      results.summary = 'URL retrieval test failed';
      return results;
    }

    // Step 4: Verify URL accessibility (attempt to fetch)
    try {
      const response = await fetch(urlResult.signedUrl!, { method: 'HEAD' });
      if (response.ok) {
        results.steps.push({
          step: 'Verify URL access',
          status: 'pass',
          message: `URL is accessible (HTTP ${response.status})`
        });
      } else {
        results.steps.push({
          step: 'Verify URL access',
          status: 'fail',
          message: `URL returned HTTP ${response.status}`
        });
      }
    } catch (fetchError: any) {
      results.steps.push({
        step: 'Verify URL access',
        status: 'fail',
        message: `Network error: ${fetchError.message}`
      });
    }

    // Step 5: Clean up - remove logo
    const removeResult = await removeOrgLogo(orgId);
    if (removeResult.success) {
      results.steps.push({
        step: 'Clean up - remove logo',
        status: 'pass',
        message: 'Logo successfully removed'
      });
    } else {
      results.steps.push({
        step: 'Clean up - remove logo',
        status: 'fail',
        message: removeResult.error || 'Cleanup failed'
      });
    }

    // Step 6: Verify removal (should return no URL)
    const verifyRemovalResult = await getOrgLogoUrl(orgId);
    if (verifyRemovalResult.success && !verifyRemovalResult.signedUrl) {
      results.steps.push({
        step: 'Verify removal',
        status: 'pass',
        message: 'Logo path correctly cleared from database'
      });
    } else {
      results.steps.push({
        step: 'Verify removal',
        status: 'fail',
        message: 'Logo path still exists after removal'
      });
    }

    // Determine overall success
    const failedSteps = results.steps.filter(step => step.status === 'fail');
    results.success = failedSteps.length === 0;
    
    if (results.success) {
      results.summary = `✅ All tests passed! Organization branding system is working correctly for org ${orgId}`;
    } else {
      results.summary = `❌ ${failedSteps.length} test(s) failed. Check individual steps for details.`;
    }

  } catch (error: any) {
    results.steps.push({
      step: 'Test execution',
      status: 'fail',
      message: `Unexpected error: ${error.message}`
    });
    results.summary = `❌ Test execution failed: ${error.message}`;
  }

  return results;
}

/**
 * Log the smoke test results to console in a readable format
 * @param results SmokeTestResult from runOrgBrandingSmokeTest
 */
export function logSmokeTestResults(results: SmokeTestResult): void {
  console.group('🧪 Organization Branding Smoke Test Results');
  
  console.log(`📊 Summary: ${results.summary}`);
  console.log(`🎯 Overall Status: ${results.success ? '✅ PASS' : '❌ FAIL'}`);
  
  console.group('📋 Step-by-Step Results:');
  results.steps.forEach((step, index) => {
    const icon = step.status === 'pass' ? '✅' : step.status === 'fail' ? '❌' : '⏭️';
    console.log(`${index + 1}. ${icon} ${step.step}: ${step.message}`);
  });
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Quick test function for development/debugging
 * @param orgId Organization ID to test
 */
export async function quickBrandingTest(orgId: string): Promise<void> {
  console.log(`🧪 Running quick branding test for org: ${orgId}`);
  const results = await runOrgBrandingSmokeTest(orgId);
  logSmokeTestResults(results);
}