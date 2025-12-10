/**
 * Articles Mock Data
 *
 * Mock data for church articles/news section
 * Used in demo mode and for development testing
 */

import type { Article } from '@/types/articles';

// =============================================================================
// MOCK ARTICLES
// =============================================================================

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'article-001',
    title: 'Building Faith Through Community Service',
    slug: 'building-faith-community-service',
    content: `
      <p>Our church family gathered this past Saturday for our monthly community outreach program.
      Over 150 volunteers came together to serve meals at the local shelter, demonstrating
      Christ's love through action.</p>

      <p>This initiative has been running for three years now, and the impact has been tremendous.
      Not only have we served thousands of meals, but we've built lasting relationships with
      those in need.</p>

      <blockquote>"When we serve others, we serve God. It's that simple." - Pastor John</blockquote>

      <p>If you'd like to join our next outreach event, sign up through the church app or
      contact our community ministry team.</p>
    `,
    excerpt:
      'Discover how serving others strengthens our faith journey and builds deeper community bonds.',
    featured_image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    category_ids: ['cat-community'],
    tag_ids: ['tag-outreach', 'tag-volunteer'],
    publish_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reading_time: 5,
    views_count: 234,
    allow_comments: true,
  },
  {
    id: 'article-002',
    title: 'Youth Camp 2025 Registration Now Open',
    slug: 'youth-camp-2025-registration',
    content: `
      <p>Exciting news for all youth ages 13-18! Registration is now open for our annual
      Youth Summer Camp 2025. This year's theme is "Rooted in Faith" based on Colossians 2:7.</p>

      <h3>Camp Details</h3>
      <ul>
        <li>Dates: July 15-20, 2025</li>
        <li>Location: Mountain View Retreat Center</li>
        <li>Cost: $350 per camper (scholarships available)</li>
      </ul>

      <p>Activities include worship sessions, small group discussions, outdoor adventures,
      talent shows, and much more!</p>

      <p>Early bird registration ends March 1st. Sign up today through the Events tab!</p>
    `,
    excerpt:
      'Registration is now open for Youth Summer Camp 2025! Theme: "Rooted in Faith"',
    featured_image:
      'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80',
    category_ids: ['cat-youth'],
    tag_ids: ['tag-camp', 'tag-youth', 'tag-registration'],
    publish_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reading_time: 3,
    views_count: 567,
    allow_comments: true,
  },
  {
    id: 'article-003',
    title: 'New Small Group Season Starting in January',
    slug: 'small-groups-january-2025',
    content: `
      <p>Our new small group season kicks off January 8th! Whether you're looking for
      Bible study, fellowship, or support, there's a group for you.</p>

      <h3>Available Groups</h3>
      <ul>
        <li>Men's Morning Study - Tuesdays 6:30 AM</li>
        <li>Women's Bible Study - Wednesdays 9:30 AM</li>
        <li>Young Adults - Thursdays 7:00 PM</li>
        <li>Marriage Enrichment - Fridays 7:00 PM</li>
        <li>Parenting Support - Saturdays 10:00 AM</li>
      </ul>

      <p>Small groups are the heartbeat of our church community. It's where real relationships
      are built and where we grow together in faith.</p>
    `,
    excerpt:
      'Join a small group this January and deepen your faith journey with others.',
    featured_image:
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
    category_ids: ['cat-small-groups'],
    tag_ids: ['tag-fellowship', 'tag-study'],
    publish_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reading_time: 4,
    views_count: 189,
    allow_comments: true,
  },
  {
    id: 'article-004',
    title: "Pastor's Corner: Finding Peace in the Storm",
    slug: 'pastors-corner-peace-storm',
    content: `
      <p>Dear Church Family,</p>

      <p>As we navigate through challenging times, I'm reminded of Jesus calming the storm
      in Mark 4:39. He simply spoke, "Peace, be still!" and the chaos ceased.</p>

      <p>The same Jesus who calmed the physical storm is present with us today. When anxiety
      rises and circumstances feel overwhelming, we can trust that He is in the boat with us.</p>

      <blockquote>"Why are you so afraid? Do you still have no faith?" - Mark 4:40</blockquote>

      <p>This week, I encourage you to:</p>
      <ol>
        <li>Spend 10 minutes each morning in silent prayer</li>
        <li>Read Mark 4:35-41 and reflect on God's power</li>
        <li>Share your burdens with a trusted friend or small group</li>
      </ol>

      <p>Remember, faith isn't the absence of fear—it's trusting God in the midst of it.</p>

      <p>Grace and Peace,<br/>Pastor David</p>
    `,
    excerpt:
      "Pastor David shares insights on finding peace during life's storms through faith.",
    featured_image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    category_ids: ['cat-pastoral'],
    tag_ids: ['tag-devotional', 'tag-faith'],
    publish_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reading_time: 6,
    views_count: 412,
    allow_comments: true,
  },
  {
    id: 'article-005',
    title: 'Christmas Service Times & Special Events',
    slug: 'christmas-service-times-2024',
    content: `
      <p>Join us as we celebrate the birth of our Savior! Here's everything you need to know
      about our Christmas services and events.</p>

      <h3>Christmas Eve Services</h3>
      <ul>
        <li>3:00 PM - Family Service (with children's program)</li>
        <li>5:00 PM - Traditional Candlelight Service</li>
        <li>7:00 PM - Contemporary Worship Service</li>
        <li>11:00 PM - Midnight Mass</li>
      </ul>

      <h3>Christmas Day Service</h3>
      <p>10:00 AM - Combined Worship Service (no children's programs)</p>

      <h3>Special Events</h3>
      <ul>
        <li>Dec 22: Christmas Choir Concert</li>
        <li>Dec 23: Live Nativity Scene (6-8 PM)</li>
        <li>Dec 24: Free Community Breakfast (8-10 AM)</li>
      </ul>

      <p>Invite your friends and family! All services are free and open to everyone.</p>
    `,
    excerpt:
      'Plan your Christmas celebration with our complete schedule of services and events.',
    featured_image:
      'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80',
    category_ids: ['cat-events'],
    tag_ids: ['tag-christmas', 'tag-worship'],
    publish_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reading_time: 4,
    views_count: 892,
    allow_comments: false,
  },
];

// Featured articles (have images and are recent)
export const MOCK_FEATURED_ARTICLES = MOCK_ARTICLES.filter(
  (article) => article.featured_image
);

// =============================================================================
// ARTICLE CATEGORIES
// =============================================================================

export const MOCK_ARTICLE_CATEGORIES = [
  {
    id: 'cat-community',
    church_id: 'demo-church-001',
    name: 'Community',
    description: 'News about our community outreach and service',
  },
  {
    id: 'cat-youth',
    church_id: 'demo-church-001',
    name: 'Youth Ministry',
    description: 'Updates and events for our youth',
  },
  {
    id: 'cat-small-groups',
    church_id: 'demo-church-001',
    name: 'Small Groups',
    description: 'Information about small groups and fellowship',
  },
  {
    id: 'cat-pastoral',
    church_id: 'demo-church-001',
    name: "Pastor's Corner",
    description: 'Messages and reflections from our pastoral team',
  },
  {
    id: 'cat-events',
    church_id: 'demo-church-001',
    name: 'Events',
    description: 'Upcoming church events and activities',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get articles with optional filtering
 */
export function getMockArticles(options?: {
  limit?: number;
  categoryId?: string;
  featured?: boolean;
}): Article[] {
  let articles = [...MOCK_ARTICLES];

  if (options?.categoryId) {
    articles = articles.filter((a) =>
      a.category_ids.includes(options.categoryId!)
    );
  }

  if (options?.featured) {
    articles = articles.filter((a) => a.featured_image);
  }

  // Sort by publish date (newest first)
  articles.sort(
    (a, b) =>
      new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()
  );

  if (options?.limit) {
    articles = articles.slice(0, options.limit);
  }

  return articles;
}
