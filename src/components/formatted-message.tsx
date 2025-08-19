
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
    p: (props: any) => <p className="mb-3 last:mb-0" {...props} />,
    pre: ({ node, children, ...props }: any) => {
      const [isCopied, setIsCopied] = useState(false);
      
      const codeElement = React.Children.toArray(children)[0] as React.ReactElement<{
        className?: string;
        children?: React.ReactNode;
      }>;
      
      if (!React.isValidElement(codeElement)) {
        return <pre {...props}>{children}</pre>;
      }

      const codeString = String(codeElement.props.children).replace(/\n$/, '');
      const language = codeElement.props.className?.replace('language-', '') || 'text';

      const handleCopy = () => {
        navigator.clipboard.writeText(codeString).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        });
      };

      return (
        <div className="relative rounded-md bg-[#0d1117]">
            <div className="absolute top-1.5 right-1.5 flex items-center gap-x-2">
                <span className="text-xs text-muted-foreground">{language === 'text' ? 'code' : language}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:bg-white/20"
                    onClick={handleCopy}
                    aria-label="Copy code"
                >
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <SyntaxHighlighter
                style={vscDarkPlus}
                customStyle={{
                    padding: '0.75rem',
                    margin: '0',
                    backgroundColor: 'transparent',
                    fontSize: '0.875rem',
                    lineHeight: '1.5rem',
                }}
                language={language}
                PreTag="div"
                wrapLongLines={true}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
      )
    },
    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return (
          <code className="rounded bg-card px-1.5 py-1 font-mono text-sm" {...props}>
            {children}
          </code>
        );
      }
      return <code className={className} {...props}>{children}</code>
    },
    strong: (props: any) => <strong className="font-bold" {...props} />,
    em: (props: any) => <em className="italic" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-5 mb-3 last:mb-0" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-5 mb-3 last:mb-0" {...props} />,
    li: (props: any) => <li className="mb-1" {...props} />,
  };

  return (
    <div className="text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
