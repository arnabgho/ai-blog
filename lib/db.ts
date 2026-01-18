import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BlogPost, PostVersion, FeedbackSession } from './types';

interface BlogEditorDB extends DBSchema {
  posts: {
    key: string;
    value: BlogPost;
    indexes: { 'by-updated': number };
  };
  versions: {
    key: string;
    value: PostVersion;
    indexes: { 'by-post': string };
  };
  feedbackSessions: {
    key: string;
    value: FeedbackSession;
    indexes: { 'by-version': string };
  };
}

let dbPromise: Promise<IDBPDatabase<BlogEditorDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BlogEditorDB>('blog-editor-db', 1, {
      upgrade(db) {
        // Posts store
        const postsStore = db.createObjectStore('posts', {
          keyPath: 'id',
        });
        postsStore.createIndex('by-updated', 'updatedAt');

        // Versions store
        const versionsStore = db.createObjectStore('versions', {
          keyPath: 'id',
        });
        versionsStore.createIndex('by-post', 'postId');

        // Feedback sessions store
        const feedbackStore = db.createObjectStore('feedbackSessions', {
          keyPath: 'id',
        });
        feedbackStore.createIndex('by-version', 'versionId');
      },
    });
  }
  return dbPromise;
}

// Posts CRUD operations
export async function createPost(post: BlogPost): Promise<void> {
  const db = await getDB();
  await db.add('posts', post);
}

export async function getPost(id: string): Promise<BlogPost | undefined> {
  const db = await getDB();
  return db.get('posts', id);
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const db = await getDB();
  const posts = await db.getAllFromIndex('posts', 'by-updated');
  return posts.reverse(); // Most recent first
}

export async function updatePost(post: BlogPost): Promise<void> {
  const db = await getDB();
  await db.put('posts', post);
}

export async function deletePost(id: string): Promise<void> {
  const db = await getDB();

  // Delete all versions for this post
  const versions = await getPostVersions(id);
  for (const version of versions) {
    await deleteVersion(version.id);
  }

  await db.delete('posts', id);
}

// Versions CRUD operations
export async function createVersion(version: PostVersion): Promise<void> {
  const db = await getDB();
  await db.add('versions', version);
}

export async function getVersion(id: string): Promise<PostVersion | undefined> {
  const db = await getDB();
  return db.get('versions', id);
}

export async function getPostVersions(postId: string): Promise<PostVersion[]> {
  const db = await getDB();
  return db.getAllFromIndex('versions', 'by-post', postId);
}

export async function updateVersion(version: PostVersion): Promise<void> {
  const db = await getDB();
  await db.put('versions', version);
}

export async function deleteVersion(id: string): Promise<void> {
  const db = await getDB();

  // Delete all feedback sessions for this version
  const sessions = await getVersionFeedbackSessions(id);
  for (const session of sessions) {
    await deleteFeedbackSession(session.id);
  }

  await db.delete('versions', id);
}

// Feedback sessions CRUD operations
export async function createFeedbackSession(session: FeedbackSession): Promise<void> {
  const db = await getDB();
  await db.add('feedbackSessions', session);
}

export async function getFeedbackSession(id: string): Promise<FeedbackSession | undefined> {
  const db = await getDB();
  return db.get('feedbackSessions', id);
}

export async function getVersionFeedbackSessions(versionId: string): Promise<FeedbackSession[]> {
  const db = await getDB();
  return db.getAllFromIndex('feedbackSessions', 'by-version', versionId);
}

export async function updateFeedbackSession(session: FeedbackSession): Promise<void> {
  const db = await getDB();
  await db.put('feedbackSessions', session);
}

export async function deleteFeedbackSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('feedbackSessions', id);
}

// Utility functions
export function calculateMetadata(content: string) {
  const wordCount = content.trim().split(/\s+/).length;
  const characterCount = content.length;
  const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;

  return {
    wordCount,
    characterCount,
    imageCount,
  };
}
