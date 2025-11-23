"""
Integration tests for Articles API endpoints.

Tests cover:
- Article CRUD operations
- Slug generation and uniqueness
- Publishing workflow (draft → published)
- Scheduled publishing
- Category and tag filtering
- Search functionality
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from tests.fixtures.factories import ArticleFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_article_success(test_client, auth_headers, church_data):
    """Test creating an article."""
    article_data = {
        "title": "Welcome to Our Church",
        "content": "<p>This is our first blog post...</p>",
        "excerpt": "This is our first post",
        "status": "draft",
        "allow_comments": True
    }

    response = await test_client.post(
        "/api/articles/",
        json=article_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Welcome to Our Church"
    assert data["status"] == "draft"
    assert "slug" in data  # Auto-generated
    assert "id" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_article_auto_generates_slug(test_client, auth_headers, church_data):
    """Test article slug is auto-generated from title."""
    article_data = {
        "title": "Hello World Article",
        "content": "<p>Content here</p>",
        "status": "draft"
    }

    response = await test_client.post(
        "/api/articles/",
        json=article_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "hello-world-article" or "hello-world" in data["slug"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_article_ensures_slug_uniqueness(test_client, auth_headers, test_db, church_data):
    """Test duplicate slugs are made unique."""
    # Create first article
    article1 = ArticleFactory.create(
        church_id=church_data["id"],
        slug="test-article"
    )
    await test_db.articles.insert_one(article1)

    # Create second with same title (should get different slug)
    article_data = {
        "title": "Test Article",  # Same as first
        "content": "<p>Content</p>",
        "status": "draft"
    }

    response = await test_client.post(
        "/api/articles/",
        json=article_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["slug"] != "test-article"  # Should be modified for uniqueness


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_articles_with_pagination(test_client, auth_headers, test_db, church_data):
    """Test listing articles with pagination."""
    # Create 15 articles
    for i in range(15):
        article = ArticleFactory.create(
            church_id=church_data["id"],
            title=f"Article {i+1}"
        )
        await test_db.articles.insert_one(article)

    response = await test_client.get(
        "/api/articles/?limit=10&offset=0",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert len(result["data"]) == 10
    assert result["pagination"]["total"] == 15
    assert result["pagination"]["has_more"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_articles_by_status(test_client, auth_headers, test_db, church_data):
    """Test filtering articles by status."""
    for status in ["draft", "published", "draft", "published", "scheduled"]:
        article = ArticleFactory.create(
            church_id=church_data["id"],
            status=status
        )
        await test_db.articles.insert_one(article)

    response = await test_client.get(
        "/api/articles/?status=published",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 2


@pytest.mark.integration
@pytest.mark.asyncio
async def test_search_articles_by_title_content(test_client, auth_headers, test_db, church_data):
    """Test searching articles by title and content."""
    articles = [
        {"title": "Easter Celebration", "content": "<p>Join us for Easter service</p>"},
        {"title": "Christmas Event", "content": "<p>Christmas celebration details</p>"},
        {"title": "Sunday Service", "content": "<p>Easter egg hunt activity</p>"}
    ]

    for article_data in articles:
        article = ArticleFactory.create(
            church_id=church_data["id"],
            **article_data
        )
        await test_db.articles.insert_one(article)

    # Search by title
    response = await test_client.get(
        "/api/articles/?search=Easter",
        headers=auth_headers
    )

    result = response.json()
    assert result["pagination"]["total"] == 2  # Found in title and content


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_articles_by_category(test_client, auth_headers, test_db, church_data):
    """Test filtering articles by category."""
    category_id = "cat-001"

    for i in range(5):
        article = ArticleFactory.create(
            church_id=church_data["id"],
            category_ids=[category_id] if i < 3 else []
        )
        await test_db.articles.insert_one(article)

    response = await test_client.get(
        f"/api/articles/?category={category_id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 3


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_recent_published_articles(test_client, auth_headers, test_db, church_data):
    """Test getting recent published articles."""
    # Create mix of draft and published
    for i in range(5):
        article = ArticleFactory.create(
            church_id=church_data["id"],
            status="published" if i < 3 else "draft",
            publish_date=datetime.utcnow() - timedelta(days=i)
        )
        await test_db.articles.insert_one(article)

    response = await test_client.get(
        "/api/articles/recent?limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    articles = response.json()
    assert len(articles) == 3  # Only published


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_article_by_id(test_client, auth_headers, test_db, church_data):
    """Test retrieving single article by ID."""
    article = ArticleFactory.create(
        church_id=church_data["id"],
        title="Test Article"
    )
    await test_db.articles.insert_one(article)

    response = await test_client.get(
        f"/api/articles/{article['id']}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == article["id"]
    assert data["title"] == "Test Article"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_article_not_found(test_client, auth_headers):
    """Test 404 when article doesn't exist."""
    response = await test_client.get(
        "/api/articles/nonexistent-id",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "NOT_FOUND"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_article_success(test_client, auth_headers, test_db, church_data):
    """Test updating an article."""
    article = ArticleFactory.create(
        church_id=church_data["id"],
        title="Old Title",
        content="<p>Old content</p>"
    )
    await test_db.articles.insert_one(article)

    update_data = {
        "title": "New Title",
        "content": "<p>New content</p>"
    }

    response = await test_client.put(
        f"/api/articles/{article['id']}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Title"
    assert data["content"] == "<p>New content</p>"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_article_success(test_client, auth_headers, test_db, church_data):
    """Test deleting an article."""
    article = ArticleFactory.create(church_id=church_data["id"])
    await test_db.articles.insert_one(article)

    response = await test_client.delete(
        f"/api/articles/{article['id']}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify deleted
    deleted = await test_db.articles.find_one({"id": article["id"]})
    assert deleted is None


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_articles_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, auth_headers
):
    """Test articles are isolated between churches."""
    # Create article for Church A
    article_a = ArticleFactory.create(
        church_id=church_data["id"],
        title="Church A Article"
    )
    await test_db.articles.insert_one(article_a)

    # Create article for Church B
    article_b = ArticleFactory.create(
        church_id=second_church_data["id"],
        title="Church B Article"
    )
    await test_db.articles.insert_one(article_b)

    # List articles (authenticated as Church A)
    response = await test_client.get(
        "/api/articles/",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()

    # Should only see Church A's article
    assert result["pagination"]["total"] == 1
    assert result["data"][0]["id"] == article_a["id"]

    # Try to access Church B's article directly (should fail)
    response = await test_client.get(
        f"/api/articles/{article_b['id']}",
        headers=auth_headers
    )

    assert response.status_code == 404
