#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CMS Article Management Module
Tests all 33 endpoints across 5 route files
"""

import requests
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import io

class ArticlesAPITester:
    def __init__(self, base_url="https://church-manager-33.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.church_id = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        
        # Store created resources
        self.created_articles = []
        self.created_categories = []
        self.created_tags = []
        self.created_comments = []

    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️",
            "TEST": "🔍"
        }.get(level, "•")
        print(f"[{timestamp}] {prefix} {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, params: Optional[Dict] = None, 
                 files: Optional[Dict] = None) -> tuple[bool, Any]:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers, params=params, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"PASSED - {name} (Status: {response.status_code})", "SUCCESS")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                self.tests_failed += 1
                error_detail = ""
                try:
                    error_data = response.json()
                    error_detail = f" | Detail: {error_data}"
                except:
                    error_detail = f" | Response: {response.text[:200]}"
                
                error_msg = f"FAILED - {name} | Expected {expected_status}, got {response.status_code}{error_detail}"
                self.log(error_msg, "ERROR")
                self.failed_tests.append(error_msg)
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            error_msg = f"FAILED - {name} | Error: {str(e)}"
            self.log(error_msg, "ERROR")
            self.failed_tests.append(error_msg)
            return False, {}

    def test_login(self):
        """Test login and get authentication token"""
        self.log("=== AUTHENTICATION ===", "INFO")
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/auth/login",
            200,
            data={
                "email": "admin@gkbjtamankencana.org",
                "password": "admin123"
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.church_id = response.get('user', {}).get('church_id')
            self.user_id = response.get('user', {}).get('id')
            self.log(f"Authenticated successfully | Church ID: {self.church_id}", "SUCCESS")
            return True
        
        self.log("Authentication failed - cannot proceed with tests", "ERROR")
        return False

    def test_categories_crud(self):
        """Test Article Categories CRUD operations"""
        self.log("\n=== ARTICLE CATEGORIES CRUD ===", "INFO")
        
        # Create category
        success, response = self.run_test(
            "Create Category",
            "POST",
            "/api/v1/articles/categories/",
            201,
            data={
                "name": "Test Category",
                "description": "Test category description"
            }
        )
        
        if success and response.get('id'):
            category_id = response['id']
            self.created_categories.append(category_id)
            
            # Verify slug was generated
            if response.get('slug'):
                self.log(f"Category slug auto-generated: {response['slug']}", "SUCCESS")
            else:
                self.log("Category slug not generated", "WARNING")
            
            # List categories
            success, response = self.run_test(
                "List Categories",
                "GET",
                "/api/v1/articles/categories/",
                200
            )
            
            # Get single category
            success, response = self.run_test(
                "Get Category",
                "GET",
                f"/api/v1/articles/categories/{category_id}",
                200
            )
            
            # Update category
            success, response = self.run_test(
                "Update Category",
                "PUT",
                f"/api/v1/articles/categories/{category_id}",
                200,
                data={"name": "Updated Category"}
            )
            
            # Try to delete category (should succeed if not used)
            success, response = self.run_test(
                "Delete Unused Category",
                "DELETE",
                f"/api/v1/articles/categories/{category_id}",
                204
            )
            
            if success:
                self.created_categories.remove(category_id)

    def test_tags_crud(self):
        """Test Article Tags CRUD operations"""
        self.log("\n=== ARTICLE TAGS CRUD ===", "INFO")
        
        # Create tag
        success, response = self.run_test(
            "Create Tag",
            "POST",
            "/api/v1/articles/tags/",
            201,
            data={"name": "Test Tag"}
        )
        
        if success and response.get('id'):
            tag_id = response['id']
            self.created_tags.append(tag_id)
            
            # Verify slug was generated
            if response.get('slug'):
                self.log(f"Tag slug auto-generated: {response['slug']}", "SUCCESS")
            else:
                self.log("Tag slug not generated", "WARNING")
            
            # List tags
            success, response = self.run_test(
                "List Tags",
                "GET",
                "/api/v1/articles/tags/",
                200
            )
            
            # Update tag
            success, response = self.run_test(
                "Update Tag",
                "PUT",
                f"/api/v1/articles/tags/{tag_id}",
                200,
                data={"name": "Updated Tag"}
            )
            
            # Try to delete tag (should succeed if not used)
            success, response = self.run_test(
                "Delete Unused Tag",
                "DELETE",
                f"/api/v1/articles/tags/{tag_id}",
                204
            )
            
            if success:
                self.created_tags.remove(tag_id)

    def test_articles_crud(self):
        """Test Articles CRUD operations"""
        self.log("\n=== ARTICLES CRUD ===", "INFO")
        
        # Create category and tag for article
        success, cat_response = self.run_test(
            "Create Category for Article",
            "POST",
            "/api/v1/articles/categories/",
            201,
            data={"name": "Article Test Category"}
        )
        category_id = cat_response.get('id') if success else None
        if category_id:
            self.created_categories.append(category_id)
        
        success, tag_response = self.run_test(
            "Create Tag for Article",
            "POST",
            "/api/v1/articles/tags/",
            201,
            data={"name": "Article Test Tag"}
        )
        tag_id = tag_response.get('id') if success else None
        if tag_id:
            self.created_tags.append(tag_id)
        
        # Create article with categories and tags
        article_data = {
            "title": "Test Article",
            "content": "<p>This is a test article with some content. It has multiple words to test reading time calculation. " * 50 + "</p>",
            "excerpt": "Test excerpt",
            "category_ids": [category_id] if category_id else [],
            "tag_ids": [tag_id] if tag_id else [],
            "status": "draft",
            "allow_comments": True
        }
        
        success, response = self.run_test(
            "Create Article with Categories and Tags",
            "POST",
            "/api/v1/articles/",
            201,
            data=article_data
        )
        
        if success and response.get('id'):
            article_id = response['id']
            self.created_articles.append(article_id)
            
            # Verify slug was auto-generated
            if response.get('slug'):
                self.log(f"Article slug auto-generated: {response['slug']}", "SUCCESS")
            else:
                self.log("Article slug not generated", "WARNING")
            
            # Verify reading time was calculated
            if response.get('reading_time'):
                self.log(f"Reading time calculated: {response['reading_time']} min", "SUCCESS")
            else:
                self.log("Reading time not calculated", "WARNING")
            
            # List articles
            success, response = self.run_test(
                "List Articles",
                "GET",
                "/api/v1/articles/",
                200
            )
            
            # Get single article
            success, response = self.run_test(
                "Get Article",
                "GET",
                f"/api/v1/articles/{article_id}",
                200
            )
            
            # Update article (verify reading_time recalculated)
            success, response = self.run_test(
                "Update Article Content",
                "PUT",
                f"/api/v1/articles/{article_id}",
                200,
                data={
                    "content": "<p>Updated content with different length. " * 100 + "</p>"
                }
            )
            
            if success and response.get('reading_time'):
                self.log(f"Reading time recalculated: {response['reading_time']} min", "SUCCESS")
            
            return article_id
        
        return None

    def test_featured_image_upload(self, article_id: str):
        """Test featured image upload with size validation"""
        self.log("\n=== FEATURED IMAGE UPLOAD ===", "INFO")
        
        if not article_id:
            self.log("No article ID provided, skipping image upload tests", "WARNING")
            return
        
        # Test 1: Upload valid image (small PNG)
        small_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 1000)  # ~1KB PNG
        small_image.name = 'test.png'
        
        files = {'file': ('test.png', small_image, 'image/png')}
        
        success, response = self.run_test(
            "Upload Valid Featured Image",
            "POST",
            f"/api/v1/articles/{article_id}/upload-featured-image",
            201,
            files=files
        )
        
        if success and response.get('image_url'):
            self.log(f"Image uploaded: {response['image_url']}", "SUCCESS")
        
        # Test 2: Upload oversized image (should fail)
        large_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * (6 * 1024 * 1024))  # 6MB
        large_image.name = 'large.png'
        
        files = {'file': ('large.png', large_image, 'image/png')}
        
        success, response = self.run_test(
            "Upload Oversized Image (Should Fail)",
            "POST",
            f"/api/v1/articles/{article_id}/upload-featured-image",
            400,  # Expecting error
            files=files
        )

    def test_preview_link_generation(self, article_id: str):
        """Test preview link generation"""
        self.log("\n=== PREVIEW LINK GENERATION ===", "INFO")
        
        if not article_id:
            self.log("No article ID provided, skipping preview link tests", "WARNING")
            return
        
        success, response = self.run_test(
            "Generate Preview Link",
            "POST",
            f"/api/v1/articles/{article_id}/generate-preview-link",
            200
        )
        
        if success:
            if response.get('preview_url'):
                self.log(f"Preview URL: {response['preview_url']}", "SUCCESS")
            if response.get('preview_token'):
                self.log(f"Preview token generated: {response['preview_token'][:20]}...", "SUCCESS")
                return response['preview_token']
        
        return None

    def test_article_scheduling(self):
        """Test article scheduling system"""
        self.log("\n=== ARTICLE SCHEDULING ===", "INFO")
        
        # Create a draft article for scheduling
        success, response = self.run_test(
            "Create Draft Article for Scheduling",
            "POST",
            "/api/v1/articles/",
            201,
            data={
                "title": "Scheduled Article Test",
                "content": "<p>This article will be scheduled</p>",
                "status": "draft"
            }
        )
        
        if success and response.get('id'):
            article_id = response['id']
            self.created_articles.append(article_id)
            
            # Schedule for future (2 minutes from now)
            future_date = (datetime.utcnow() + timedelta(minutes=2)).isoformat()
            
            success, response = self.run_test(
                "Schedule Article for Future",
                "POST",
                f"/api/v1/articles/{article_id}/schedule",
                200,
                params={"scheduled_publish_date": future_date}
            )
            
            if success:
                if response.get('schedule_status') == 'scheduled':
                    self.log("Article scheduled successfully", "SUCCESS")
                else:
                    self.log(f"Unexpected schedule_status: {response.get('schedule_status')}", "WARNING")
            
            # Unschedule
            success, response = self.run_test(
                "Unschedule Article",
                "POST",
                f"/api/v1/articles/{article_id}/unschedule",
                200
            )
            
            if success and response.get('schedule_status') == 'none':
                self.log("Article unscheduled successfully", "SUCCESS")

    def test_article_duplication(self, article_id: str):
        """Test article duplication"""
        self.log("\n=== ARTICLE DUPLICATION ===", "INFO")
        
        if not article_id:
            self.log("No article ID provided, skipping duplication test", "WARNING")
            return
        
        success, response = self.run_test(
            "Duplicate Article",
            "POST",
            f"/api/v1/articles/{article_id}/duplicate",
            201
        )
        
        if success and response.get('id'):
            new_article_id = response['id']
            self.created_articles.append(new_article_id)
            
            # Verify new slug
            if response.get('slug') and '-copy' in response['slug']:
                self.log(f"Duplicate has new slug: {response['slug']}", "SUCCESS")
            
            # Verify status is draft
            if response.get('status') == 'draft':
                self.log("Duplicate status is draft", "SUCCESS")
            else:
                self.log(f"Unexpected duplicate status: {response.get('status')}", "WARNING")
            
            # Verify views_count reset
            if response.get('views_count') == 0:
                self.log("Views count reset to 0", "SUCCESS")

    def test_views_increment(self, article_id: str):
        """Test article views increment"""
        self.log("\n=== VIEWS INCREMENT ===", "INFO")
        
        if not article_id:
            self.log("No article ID provided, skipping views test", "WARNING")
            return
        
        # Get current views
        success, response = self.run_test(
            "Get Article Before View Increment",
            "GET",
            f"/api/v1/articles/{article_id}",
            200
        )
        
        initial_views = response.get('views_count', 0) if success else 0
        
        # Increment views
        success, response = self.run_test(
            "Increment Article Views",
            "POST",
            f"/api/v1/articles/{article_id}/increment-view",
            200
        )
        
        # Verify increment
        success, response = self.run_test(
            "Get Article After View Increment",
            "GET",
            f"/api/v1/articles/{article_id}",
            200
        )
        
        if success:
            new_views = response.get('views_count', 0)
            if new_views == initial_views + 1:
                self.log(f"Views incremented: {initial_views} -> {new_views}", "SUCCESS")
            else:
                self.log(f"Views not incremented correctly: {initial_views} -> {new_views}", "WARNING")

    def test_recent_articles(self):
        """Test get recent articles endpoint"""
        self.log("\n=== RECENT ARTICLES ===", "INFO")
        
        success, response = self.run_test(
            "Get Recent Articles",
            "GET",
            "/api/v1/articles/recent",
            200,
            params={"limit": 10}
        )
        
        if success and isinstance(response, list):
            self.log(f"Retrieved {len(response)} recent articles", "SUCCESS")

    def test_comments_crud(self, article_id: str):
        """Test article comments CRUD and moderation"""
        self.log("\n=== ARTICLE COMMENTS ===", "INFO")
        
        if not article_id:
            self.log("No article ID provided, skipping comments tests", "WARNING")
            return
        
        # Create comment
        success, response = self.run_test(
            "Create Comment",
            "POST",
            f"/api/v1/articles/{article_id}/comments/",
            201,
            data={
                "author_name": "Test User",
                "author_email": "test@example.com",
                "content": "This is a test comment",
                "status": "pending"
            }
        )
        
        if success and response.get('id'):
            comment_id = response['id']
            self.created_comments.append(comment_id)
            
            # List comments
            success, response = self.run_test(
                "List Comments for Article",
                "GET",
                f"/api/v1/articles/{article_id}/comments/",
                200
            )
            
            # Get single comment
            success, response = self.run_test(
                "Get Comment",
                "GET",
                f"/api/v1/articles/comments/{comment_id}",
                200
            )
            
            # Update comment status (moderation)
            success, response = self.run_test(
                "Update Comment Status to Approved",
                "PUT",
                f"/api/v1/articles/comments/{comment_id}",
                200,
                data={"status": "approved"}
            )
            
            # Create more comments for bulk action test
            comment_ids = [comment_id]
            for i in range(2):
                success, response = self.run_test(
                    f"Create Comment {i+2} for Bulk Test",
                    "POST",
                    f"/api/v1/articles/{article_id}/comments/",
                    201,
                    data={
                        "author_name": f"Test User {i+2}",
                        "author_email": f"test{i+2}@example.com",
                        "content": f"Test comment {i+2}",
                        "status": "pending"
                    }
                )
                if success and response.get('id'):
                    comment_ids.append(response['id'])
                    self.created_comments.append(response['id'])
            
            # Bulk action
            success, response = self.run_test(
                "Bulk Approve Comments",
                "POST",
                "/api/v1/articles/comments/bulk-action",
                200,
                data={
                    "comment_ids": comment_ids,
                    "action": "approve"
                }
            )
            
            if success and response.get('modified_count'):
                self.log(f"Bulk action modified {response['modified_count']} comments", "SUCCESS")

    def test_public_api(self):
        """Test public API endpoints (no auth required)"""
        self.log("\n=== PUBLIC API ===", "INFO")
        
        if not self.church_id:
            self.log("No church_id available, skipping public API tests", "WARNING")
            return
        
        # Create and publish an article for public API testing
        success, response = self.run_test(
            "Create Published Article for Public API",
            "POST",
            "/api/v1/articles/",
            201,
            data={
                "title": "Public Article Test",
                "content": "<p>This is a public article</p>",
                "status": "published",
                "publish_date": datetime.utcnow().isoformat(),
                "featured_image": "/test/image.jpg"
            }
        )
        
        if success and response.get('id'):
            article_id = response['id']
            article_slug = response.get('slug')
            self.created_articles.append(article_id)
            
            # Test public articles list (no auth)
            temp_token = self.token
            self.token = None  # Remove auth
            
            success, response = self.run_test(
                "Public: List Published Articles",
                "GET",
                "/api/public/articles/",
                200,
                params={"church_id": self.church_id, "limit": 20}
            )
            
            if success and isinstance(response.get('data'), list):
                # Verify only published articles returned
                for article in response['data']:
                    if article.get('status') != 'published':
                        self.log(f"Non-published article in public API: {article.get('status')}", "WARNING")
            
            # Test featured articles
            success, response = self.run_test(
                "Public: Get Featured Articles",
                "GET",
                "/api/public/articles/featured",
                200,
                params={"church_id": self.church_id, "limit": 10}
            )
            
            if success and isinstance(response, list):
                # Verify all have featured_image
                for article in response:
                    if not article.get('featured_image'):
                        self.log("Article without featured_image in featured endpoint", "WARNING")
            
            # Test get article by slug
            if article_slug:
                success, response = self.run_test(
                    "Public: Get Article by Slug",
                    "GET",
                    f"/api/public/articles/{article_slug}",
                    200,
                    params={"church_id": self.church_id}
                )
            
            # Test public categories
            success, response = self.run_test(
                "Public: List Categories",
                "GET",
                "/api/public/articles/categories/",
                200,
                params={"church_id": self.church_id}
            )
            
            # Test public tags
            success, response = self.run_test(
                "Public: List Tags",
                "GET",
                "/api/public/articles/tags/",
                200,
                params={"church_id": self.church_id}
            )
            
            self.token = temp_token  # Restore auth

    def test_category_delete_protection(self):
        """Test that categories in use cannot be deleted"""
        self.log("\n=== CATEGORY DELETE PROTECTION ===", "INFO")
        
        # Create category
        success, response = self.run_test(
            "Create Category for Delete Test",
            "POST",
            "/api/v1/articles/categories/",
            201,
            data={"name": "Protected Category"}
        )
        
        if success and response.get('id'):
            category_id = response['id']
            self.created_categories.append(category_id)
            
            # Create article using this category
            success, response = self.run_test(
                "Create Article with Category",
                "POST",
                "/api/v1/articles/",
                201,
                data={
                    "title": "Article with Category",
                    "content": "<p>Test</p>",
                    "category_ids": [category_id],
                    "status": "draft"
                }
            )
            
            if success and response.get('id'):
                article_id = response['id']
                self.created_articles.append(article_id)
                
                # Try to delete category (should fail)
                success, response = self.run_test(
                    "Try Delete Category in Use (Should Fail)",
                    "DELETE",
                    f"/api/v1/articles/categories/{category_id}",
                    403  # Expecting forbidden
                )
                
                if success:
                    self.log("Category delete protection working", "SUCCESS")

    def cleanup(self):
        """Clean up created test resources"""
        self.log("\n=== CLEANUP ===", "INFO")
        
        # Delete comments
        for comment_id in self.created_comments:
            self.run_test(
                f"Cleanup: Delete Comment {comment_id[:8]}",
                "DELETE",
                f"/api/v1/articles/comments/{comment_id}",
                204
            )
        
        # Delete articles
        for article_id in self.created_articles:
            self.run_test(
                f"Cleanup: Delete Article {article_id[:8]}",
                "DELETE",
                f"/api/v1/articles/{article_id}",
                204
            )
        
        # Delete tags
        for tag_id in self.created_tags:
            self.run_test(
                f"Cleanup: Delete Tag {tag_id[:8]}",
                "DELETE",
                f"/api/v1/articles/tags/{tag_id}",
                204
            )
        
        # Delete categories
        for category_id in self.created_categories:
            self.run_test(
                f"Cleanup: Delete Category {category_id[:8]}",
                "DELETE",
                f"/api/v1/articles/categories/{category_id}",
                204
            )

    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("="*60, "INFO")
        self.log(f"Total Tests: {self.tests_run}", "INFO")
        self.log(f"Passed: {self.tests_passed}", "SUCCESS")
        self.log(f"Failed: {self.tests_failed}", "ERROR")
        
        if self.tests_failed > 0:
            self.log("\nFailed Tests:", "ERROR")
            for failed in self.failed_tests:
                self.log(f"  - {failed}", "ERROR")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\nSuccess Rate: {success_rate:.1f}%", "INFO")
        
        return self.tests_failed == 0

def main():
    tester = ArticlesAPITester()
    
    # Authentication
    if not tester.test_login():
        return 1
    
    # Run all tests
    tester.test_categories_crud()
    tester.test_tags_crud()
    
    article_id = tester.test_articles_crud()
    
    if article_id:
        tester.test_featured_image_upload(article_id)
        preview_token = tester.test_preview_link_generation(article_id)
        tester.test_views_increment(article_id)
        tester.test_comments_crud(article_id)
        tester.test_article_duplication(article_id)
    
    tester.test_article_scheduling()
    tester.test_recent_articles()
    tester.test_public_api()
    tester.test_category_delete_protection()
    
    # Cleanup
    tester.cleanup()
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
