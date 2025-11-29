/**
 * API Services Index
 *
 * Re-exports the main API client and all sub-service modules.
 * This resolves the naming conflict between services/api.ts and services/api/ folder.
 */

// Re-export main api client from parent
export { api, default } from '../api';

// Export sub-services
export { callApi } from './call';
