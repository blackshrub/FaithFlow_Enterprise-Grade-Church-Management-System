/**
 * Notification Templates API Service
 *
 * Handles all API calls for reusable notification template management.
 */

import api from './api';

const BASE_URL = '/api/notification-templates';

// =============================================================================
// TEMPLATE CRUD
// =============================================================================

/**
 * List notification templates with pagination and filtering
 * @param {Object} params - Query parameters
 * @param {string} [params.category] - Filter by category
 * @param {string} [params.search] - Search in name/description
 * @param {string} [params.tags] - Comma-separated tags to filter by
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {number} [params.limit=50] - Page size
 * @param {number} [params.offset=0] - Offset for pagination
 */
export const getTemplates = (params = {}) =>
  api.get(`${BASE_URL}/`, { params });

/**
 * Get a single template by ID
 * @param {string} id - Template ID
 */
export const getTemplate = (id) =>
  api.get(`${BASE_URL}/${id}`);

/**
 * Create a new notification template
 * @param {Object} data - Template data
 * @param {string} data.name - Template name
 * @param {string} [data.description] - Template description
 * @param {string} [data.category='general'] - Template category
 * @param {string} data.title - Notification title (supports {{variables}})
 * @param {string} data.body - Notification body (supports {{variables}})
 * @param {string} [data.image_url] - Default image URL
 * @param {string} [data.action_type='none'] - Default action type
 * @param {Object} [data.action_data] - Default action data
 * @param {string} [data.priority='normal'] - Default priority
 * @param {Array} [data.custom_variables] - Custom variables for this template
 * @param {string[]} [data.tags] - Tags for categorization
 */
export const createTemplate = (data) =>
  api.post(`${BASE_URL}/`, data);

/**
 * Update an existing template
 * @param {string} id - Template ID
 * @param {Object} data - Fields to update
 */
export const updateTemplate = (id, data) =>
  api.put(`${BASE_URL}/${id}`, data);

/**
 * Delete a template
 * @param {string} id - Template ID
 */
export const deleteTemplate = (id) =>
  api.delete(`${BASE_URL}/${id}`);

// =============================================================================
// TEMPLATE ACTIONS
// =============================================================================

/**
 * Preview a template with variable substitution
 * @param {string} id - Template ID
 * @param {Object} variables - Variable values for substitution
 */
export const previewTemplate = (id, variables = {}) =>
  api.post(`${BASE_URL}/${id}/preview`, { variables });

/**
 * Duplicate a template
 * @param {string} id - Template ID
 */
export const duplicateTemplate = (id) =>
  api.post(`${BASE_URL}/${id}/duplicate`);

/**
 * Create a campaign from a template
 * @param {string} id - Template ID
 * @param {Object} data - Campaign creation data
 * @param {Object} [data.variables] - Variable values for substitution
 * @param {string} [data.title_override] - Override the template title
 * @param {string} [data.body_override] - Override the template body
 * @param {string} [data.image_url_override] - Override the template image
 */
export const createCampaignFromTemplate = (id, data = {}) =>
  api.post(`${BASE_URL}/${id}/create-campaign`, data);

/**
 * Get all variables used in a template
 * @param {string} id - Template ID
 */
export const getTemplateVariables = (id) =>
  api.get(`${BASE_URL}/${id}/variables`);

// =============================================================================
// CATEGORIES & TAGS
// =============================================================================

/**
 * Get all unique categories
 */
export const getCategories = () =>
  api.get(`${BASE_URL}/categories`);

/**
 * Get all unique tags
 */
export const getTags = () =>
  api.get(`${BASE_URL}/tags`);

/**
 * Get available system variables
 */
export const getSystemVariables = () =>
  api.get(`${BASE_URL}/system-variables`);

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const notificationTemplatesApi = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  duplicateTemplate,
  createCampaignFromTemplate,
  getTemplateVariables,
  getCategories,
  getTags,
  getSystemVariables,
};

export default notificationTemplatesApi;
