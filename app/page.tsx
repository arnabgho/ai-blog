'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import {
  getAllPosts,
  createPost,
  createVersion,
  calculateMetadata,
  deletePost,
  deleteVersion,
  getPostVersions,
} from '@/lib/db';
import type { BlogPost } from '@/lib/types';
import { Trash2 } from 'lucide-react';

export default function Home() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMarkdown, setNewMarkdown] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const allPosts = await getAllPosts();
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost() {
    if (!newMarkdown.trim()) {
      alert('Please paste some markdown content');
      return;
    }

    const postId = uuidv4();
    const versionId = uuidv4();
    const now = Date.now();

    const title = newTitle.trim() || 'Untitled Post';

    // Create the post
    const post: BlogPost = {
      id: postId,
      title,
      createdAt: now,
      updatedAt: now,
      currentVersionId: versionId,
    };

    // Create the first version
    const version = {
      id: versionId,
      postId,
      versionNumber: 1,
      content: newMarkdown,
      createdAt: now,
      metadata: calculateMetadata(newMarkdown),
    };

    try {
      await createPost(post);
      await createVersion(version);

      // Navigate to the editor
      router.push(`/editor/${postId}`);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    }
  }

  async function handleDeletePost(postId: string, postTitle: string) {
    const confirmed = confirm(`Delete "${postTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      // Get all versions for this post
      const versions = await getPostVersions(postId);

      // Delete all versions (cascades to feedback sessions)
      for (const version of versions) {
        await deleteVersion(version.id);
      }

      // Delete the post record
      await deletePost(postId);

      // Update UI state
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            AI Blog Editor
          </h1>
          <p className="text-muted-foreground text-lg">
            Write, refine, and perfect your blog posts with AI-powered feedback
          </p>
        </div>

        {/* Create New Post Button */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowCreateModal(true)}
          className="mb-8 gradient-shimmer text-white"
        >
          + New Post
        </Button>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-lg mb-4">
              No posts yet. Create your first blog post!
            </p>
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>
              Get Started
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer bg-muted/30 relative group"
                onClick={() => router.push(`/editor/${post.id}`)}
              >
                <h2 className="text-2xl font-semibold mb-2 pr-12">{post.title}</h2>
                <p className="text-muted-foreground text-sm">
                  Updated {formatDate(post.updatedAt)}
                </p>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePost(post.id, post.title);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  aria-label="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold mb-2">Create New Post</h2>
              <p className="text-muted-foreground">
                Paste your markdown or start writing
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Enter post title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Markdown Content
                </label>
                <textarea
                  placeholder="# My Blog Post&#10;&#10;Paste your markdown here..."
                  value={newMarkdown}
                  onChange={(e) => setNewMarkdown(e.target.value)}
                  className="w-full h-96 px-4 py-3 border border-input rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewMarkdown('');
                  setNewTitle('');
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreatePost}>
                Create Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
