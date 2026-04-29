'use client';

import React, { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('sql', sql);
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import remarkGfm from 'remark-gfm';

const CodeBlock = memo(function CodeBlock({ language, code }: { language: string; code: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <div className="relative rounded-md bg-[#0d1117] overflow-x-auto">
      <div className="absolute top-1.5 right-1.5 flex items-center gap-x-2">
        <span className="text-xs text-muted-foreground">{language === 'text' ? 'code' : language}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-white/20" onClick={handleCopy} aria-label="Copy code">
          {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} customStyle={{ padding: '0.75rem', margin: '0', backgroundColor: 'transparent', fontSize: '0.875rem', lineHeight: '1.5rem' }} language={language} PreTag="div" wrapLongLines={true}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

export const FormattedMessage = memo(function FormattedMessage({ content }: { content: string }) {
  const components = useMemo(() => ({
    p: (props: any) => <p className="mb-3 last:mb-0" {...props} />,
    pre: ({ node, children, ...props }: any) => {
      const codeElement = React.Children.toArray(children)[0] as React.ReactElement;
      if (!React.isValidElement(codeElement)) return <pre {...props}>{children}</pre>;
      const codeString = String((codeElement.props as any).children).replace(/\n$/, '');
      const language = (codeElement.props as any).className?.replace('language-', '') || 'text';
      return <CodeBlock language={language} code={codeString} />;
    },
    code({ node, inline, className, children, ...props }: any) {
      if (inline) return <code className="rounded bg-card px-1.5 py-1 font-mono text-sm break-all" {...props}>{children}</code>;
      return <code className={className} {...props}>{children}</code>;
    },
    strong: (props: any) => <strong className="font-bold" {...props} />,
    em: (props: any) => <em className="italic" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-5 mb-3 last:mb-0" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-5 mb-3 last:mb-0" {...props} />,
    li: (props: any) => <li className="mb-1" {...props} />,
    a: ({ href, children, ...props }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline" {...props}>{children}</a>
    ),
  }), []);

  return (
    <div className="text-sm leading-relaxed break-words overflow-hidden [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
    </div>
  );
});
