import { journals } from '@/config/journals-generated';

/**
 * Filter journals based on the build environment.
 * 
 * Preprod journals: 'epijinfo' or any journal containing '-preprod'
 * Prod journals: everything else
 * 
 * @returns Array of journal IDs for the current build environment
 */
export function getFilteredJournals(): string[] {
  const buildEnv = process.env.BUILD_ENV || 'prod';
  
  return journals.filter(id => {
    const isPreprod = id === 'epijinfo' || id.includes('-preprod');
    return buildEnv === 'preprod' ? isPreprod : !isPreprod;
  });
}
