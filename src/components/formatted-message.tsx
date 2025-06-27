'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import remarkGfm from 'remark-gfm';

export function FormattedMessage({ content }: { content: string }) {
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const [isCopied, setIsCopied] = useState(false);
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      const handleCopy = () => {
        const codeString = String(children).replace(/\n$/, '');
        navigator.clipboard.writeText(codeString).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        });
      };

      if (!inline && match) {
        return (
          <div className="rounded-lg border">
            <div className="flex items-center justify-between bg-card px-4 py-1.5">
              <span className="text-xs text-muted-foreground">{language}</span>
               <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={handleCopy}
                aria-label="Copy code"
              >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              customStyle={{
                padding: '1rem',
                margin: 0,
                backgroundColor: '#0d1117',
                borderRadius: '0',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
              }}
              language={language}
              PreTag="div"
              wrapLongLines={true}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        )
      }

      return (
        <code className="rounded bg-card px-1.5 py-1 font-mono text-sm" {...props}>
          {children}
        </code>
      );
    },
    p: (props: any) => <p className="mb-2 last:mb-0" {...props} />,
    strong: (props: any) => <strong className="font-bold" {...props} />,
    em: (props: any) => <em className="italic" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-5 mb-2" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-5 mb-2" {...props} />,
    li: (props: any) => <li className="mb-1" {...props} />,
  };

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
