export interface BlogPost {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  currentVersionId: string;
}

export interface PostVersion {
  id: string;
  postId: string;
  versionNumber: number;
  content: string;
  createdAt: number;
  metadata: {
    wordCount: number;
    imageCount: number;
    characterCount: number;
  };
}

export interface FeedbackSession {
  id: string;
  versionId: string;
  items: FeedbackItem[];
  status: 'collecting' | 'processing' | 'completed';
  createdAt: number;
  completedAt?: number;
}

export interface FeedbackItem {
  id: string;
  type: 'text' | 'image';

  // For text feedback
  startOffset?: number;
  endOffset?: number;
  selectedText?: string;

  // For image feedback
  imageMarkdown?: string;
  imageLine?: number;

  // Common
  comment: string;
  regeneratedContent?: string;
  status: 'pending' | 'processing' | 'completed';
}

export interface EditorState {
  postId: string;
  currentVersion: PostVersion;
  markdown: string;
  feedbackMode: boolean;
  feedbackItems: FeedbackItem[];
  isRegenerating: boolean;
}
