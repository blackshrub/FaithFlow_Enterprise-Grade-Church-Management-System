import api from './api';

const BASE_URL = '/v1/articles';
const PUBLIC_URL = '/public/articles';

// ============================================
// ARTICLES
// ============================================

export const getArticles = (params = {}) => {
  return api.get(`${BASE_URL}/`, { params });
};

export const getRecentArticles = (limit = 10) => {
  return api.get(`${BASE_URL}/recent`, { params: { limit } });
};

export const getArticleById = (id) => {
  return api.get(`${BASE_URL}/${id}`);
};

export const createArticle = (data) => {
  return api.post(`${BASE_URL}/`, data);
};

export const updateArticle = (id, data) => {
  return api.put(`${BASE_URL}/${id}`, data);
};

export const deleteArticle = (id) => {
  return api.delete(`${BASE_URL}/${id}`);
};

export const uploadFeaturedImage = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post(`${BASE_URL}/${id}/upload-featured-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const generatePreviewLink = (id) => {
  return api.post(`${BASE_URL}/${id}/generate-preview-link`);
};

export const scheduleArticle = (id, scheduledPublishDate) => {
  return api.post(`${BASE_URL}/${id}/schedule`, null, {
    params: { scheduled_publish_date: scheduledPublishDate }
  });
};

export const unscheduleArticle = (id) => {
  return api.post(`${BASE_URL}/${id}/unschedule`);
};

export const duplicateArticle = (id) => {
  return api.post(`${BASE_URL}/${id}/duplicate`);
};

export const incrementArticleView = (id) => {
  return api.post(`${BASE_URL}/${id}/increment-view`);
};

// ============================================
// CATEGORIES
// ============================================

export const getCategories = () => {
  return api.get(`${BASE_URL}/categories/`);
};

export const getCategoryById = (id) => {
  return api.get(`${BASE_URL}/categories/${id}`);
};

export const createCategory = (data) => {
  return api.post(`${BASE_URL}/categories/`, data);
};

export const updateCategory = (id, data) => {
  return api.put(`${BASE_URL}/categories/${id}`, data);
};

export const deleteCategory = (id) => {
  return api.delete(`${BASE_URL}/categories/${id}`);
};

// ============================================
// TAGS
// ============================================

export const getTags = () => {
  return api.get(`${BASE_URL}/tags/`);
};

export const createTag = (data) => {
  return api.post(`${BASE_URL}/tags/`, data);
};

export const updateTag = (id, data) => {
  return api.put(`${BASE_URL}/tags/${id}`, data);
};

export const deleteTag = (id) => {
  return api.delete(`${BASE_URL}/tags/${id}`);
};

// ============================================
// COMMENTS
// ============================================

export const getComments = (articleId, params = {}) => {
  return api.get(`${BASE_URL}/${articleId}/comments/`, { params });
};

export const getCommentById = (id) => {
  return api.get(`${BASE_URL}/comments/${id}`);
};

export const createComment = (articleId, data) => {
  return api.post(`${BASE_URL}/${articleId}/comments/`, data);
};

export const updateComment = (id, data) => {
  return api.put(`${BASE_URL}/comments/${id}`, data);
};

export const deleteComment = (id) => {
  return api.delete(`${BASE_URL}/comments/${id}`);
};

export const bulkCommentAction = (commentIds, action) => {
  return api.post(`${BASE_URL}/comments/bulk-action`, {
    comment_ids: commentIds,
    action: action
  });
};

// ============================================
// PUBLIC API (Mobile)
// ============================================

export const getPublicArticles = (churchId, params = {}) => {
  return api.get(`${PUBLIC_URL}/`, { params: { church_id: churchId, ...params } });
};

export const getPublicArticleBySlug = (churchId, slug) => {
  return api.get(`${PUBLIC_URL}/${slug}`, { params: { church_id: churchId } });
};

export const getFeaturedArticles = (churchId, limit = 10) => {
  return api.get(`${PUBLIC_URL}/featured`, { params: { church_id: churchId, limit } });
};

export const getPublicCategories = (churchId) => {
  return api.get(`${PUBLIC_URL}/categories/`, { params: { church_id: churchId } });
};

export const getPublicTags = (churchId) => {
  return api.get(`${PUBLIC_URL}/tags/`, { params: { church_id: churchId } });
};

export const getArticlePreview = (churchId, slug, token) => {
  return api.get(`/public/article-preview/${slug}`, {
    params: { church_id: churchId, token }
  });
};

export default {
  getArticles,
  getRecentArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadFeaturedImage,
  generatePreviewLink,
  scheduleArticle,
  unscheduleArticle,
  duplicateArticle,
  incrementArticleView,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  bulkCommentAction,
  getPublicArticles,
  getPublicArticleBySlug,
  getFeaturedArticles,
  getPublicCategories,
  getPublicTags,
  getArticlePreview
};
