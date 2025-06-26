'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import remarkGfm from 'remark-gfm';

const codeBlockStyle = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    padding: '1rem',
    margin: '0',
    borderRadius: '0 0 0.375rem 0.375rem', 
    backgroundColor: '#1E1E1E',
  },
};

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

      return !inline && match ? (
        <div className="relative my-2 rounded-md bg-[#1e1e1e] border border-zinc-700 -mx-3">
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-700">
            <span className="text-xs text-zinc-400">{language || 'code'}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              onClick={handleCopy}
              aria-label="Copy code"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <SyntaxHighlighter
            style={codeBlockStyle}
            language={language}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-sm mx-0.5" {...props}>
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
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
