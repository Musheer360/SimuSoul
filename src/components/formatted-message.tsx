
'use client';

import React, { useState, useMemo, memo } from 'react';
import ReactMarkdown, { Components, ExtraProps } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import remarkGfm from 'remark-gfm';

interface CodeBlockProps {
  codeString: string;
  language: string;
}

/** Props for code element extracted from pre's children */
interface CodeElementProps {
  children?: React.ReactNode;
  className?: string;
}

/** Type guard to check if element has the expected code props structure */
function hasCodeProps(props: unknown): props is CodeElementProps {
  if (!props || typeof props !== 'object') return false;
  const p = props as Record<string, unknown>;
  return (
    (p.children === undefined || typeof p.children !== 'undefined') &&
    (p.className === undefined || typeof p.className === 'string')
  );
}

// Separate component for code blocks that can properly use hooks
const CodeBlock = memo(function CodeBlock({ codeString, language }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-md bg-[#0d1117] overflow-x-auto">
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
  );
});

// Define stable component references outside render to avoid recreation
const Paragraph = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className="mb-3 last:mb-0" {...props}>{children}</p>
);
const Strong = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <strong className="font-bold" {...props}>{children}</strong>
);
const Emphasis = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <em className="italic" {...props}>{children}</em>
);
const UnorderedList = ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
  <ul className="list-disc pl-5 mb-3 last:mb-0" {...props}>{children}</ul>
);
const OrderedList = ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
  <ol className="list-decimal pl-5 mb-3 last:mb-0" {...props}>{children}</ol>
);
const ListItem = ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li className="mb-1" {...props}>{children}</li>
);

export const FormattedMessage = memo(function FormattedMessage({ content }: { content: string }) {
  // Memoize components object to avoid creating new object on every render
  const components: Components = useMemo(() => ({
    p: Paragraph,
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement> & ExtraProps) => {
      const codeElement = React.Children.toArray(children)[0];
      
      if (!React.isValidElement(codeElement)) {
        return <pre {...props}>{children}</pre>;
      }

      // Safely extract props from the code element using type guard
      if (!hasCodeProps(codeElement.props)) {
        return <pre {...props}>{children}</pre>;
      }
      
      const codeProps = codeElement.props;
      const codeString = String(codeProps.children || '').replace(/\n$/, '');
      const language = codeProps.className?.replace('language-', '') || 'text';

      return <CodeBlock codeString={codeString} language={language} />;
    },
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & ExtraProps) => {
      // Check if this is inline code (not inside a pre tag)
      // When inside pre, the parent component handles it
      const isInline = !className?.includes('language-');
      if (isInline) {
        return (
          <code className="rounded bg-card px-1.5 py-1 font-mono text-sm break-all" {...props}>
            {children}
          </code>
        );
      }
      return <code className={className} {...props}>{children}</code>;
    },
    strong: Strong,
    em: Emphasis,
    ul: UnorderedList,
    ol: OrderedList,
    li: ListItem,
  }), []);

  return (
    <div className="text-sm leading-relaxed break-words overflow-hidden [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
