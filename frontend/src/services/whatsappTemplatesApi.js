/**
 * WhatsApp Templates API Service
 *
 * API calls for managing WhatsApp message templates
 */

import api from './api';

export const whatsappTemplatesApi = {
  /**
   * List all WhatsApp templates for the current church
   */
  listTemplates: async () => {
    const response = await api.get('/whatsapp-templates');
    return response.data;
  },

  /**
   * Get a specific template by type
   * @param {string} templateType - accept_jesus_confirmation, baptism_confirmation, etc.
   */
  getTemplate: async (templateType) => {
    const response = await api.get(`/whatsapp-templates/${templateType}`);
    return response.data;
  },

  /**
   * Update a template's content
   * @param {string} templateType - Template type to update
   * @param {object} data - { name, message_template_en, message_template_id, is_active }
   */
  updateTemplate: async (templateType, data) => {
    const response = await api.put(`/whatsapp-templates/${templateType}`, data);
    return response.data;
  },

  /**
   * Upload an attachment for a template
   * @param {string} templateType - Template type
   * @param {File} file - Image or PDF file to upload
   */
  uploadAttachment: async (templateType, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/whatsapp-templates/${templateType}/attachment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Remove the attachment from a template
   * @param {string} templateType - Template type
   */
  removeAttachment: async (templateType) => {
    const response = await api.delete(`/whatsapp-templates/${templateType}/attachment`);
    return response.data;
  },

  /**
   * Send a test message using a template
   * @param {string} templateType - Template type
   * @param {string} phoneNumber - Phone to send test to
   * @param {string} language - 'en' or 'id'
   */
  sendTest: async (templateType, phoneNumber, language = 'en') => {
    const response = await api.post(`/whatsapp-templates/${templateType}/test`, null, {
      params: { phone_number: phoneNumber, language },
    });
    return response.data;
  },

  /**
   * Reset a template to default content
   * @param {string} templateType - Template type
   */
  resetToDefault: async (templateType) => {
    const response = await api.post(`/whatsapp-templates/${templateType}/reset`);
    return response.data;
  },
};

export default whatsappTemplatesApi;
