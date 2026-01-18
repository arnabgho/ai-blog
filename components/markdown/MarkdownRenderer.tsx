import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-lg ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom renderers can be added here for feedback highlights
          p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
          h1: ({ children }) => <h1 className="text-4xl font-bold mb-4 mt-8">{children}</h1>,
          h2: ({ children }) => <h2 className="text-3xl font-bold mb-3 mt-6">{children}</h2>,
          h3: ({ children }) => <h3 className="text-2xl font-bold mb-2 mt-4">{children}</h3>,
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm" {...props}>
                {children}
              </code>
            );
          },
          img: ({ node, src, alt, ...props }: any) => {
            // Ensure src exists and is valid
            if (!src) return null;

            return (
              <img
                src={src}
                alt={alt || ''}
                className="rounded-lg my-4 max-w-full h-auto"
                loading="lazy"
                onError={(e) => {
                  console.error('Image failed to load:', src.slice(0, 100));
                  e.currentTarget.style.display = 'none';
                }}
              />
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-accent transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
