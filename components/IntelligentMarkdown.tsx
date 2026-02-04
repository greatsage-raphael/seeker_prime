import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface IntelligentMarkdownProps {
  content: string;
}

const IntelligentMarkdown: React.FC<IntelligentMarkdownProps> = ({ content }) => {
  // Aggressively parse and convert pseudo-tables to real markdown tables
  // Aggressively parse and convert pseudo-tables to real markdown tables
  // Aggressively parse and convert pseudo-tables to real markdown tables
  const preprocessContent = (text: string): string => {
    let processed = text;
    
    // Convert LaTeX arrows to visual arrows
    processed = processed.replace(/\$\\rightarrow\$/g, '→');
    processed = processed.replace(/\$\\Rightarrow\$/g, '⇒');
    processed = processed.replace(/\$\\leftarrow\$/g, '←');
    processed = processed.replace(/\$\\Leftarrow\$/g, '⇐');
    processed = processed.replace(/\$\\leftrightarrow\$/g, '↔');
    processed = processed.replace(/\$\\Leftrightarrow\$/g, '⇔');
    
    // Also handle without dollar signs
    processed = processed.replace(/\\rightarrow/g, '→');
    processed = processed.replace(/\\Rightarrow/g, '⇒');
    processed = processed.replace(/\\leftarrow/g, '←');
    processed = processed.replace(/\\Leftarrow/g, '⇐');
    processed = processed.replace(/\\leftrightarrow/g, '↔');
    processed = processed.replace(/\\Leftrightarrow/g, '⇔');
    
    // Convert common LaTeX comparison operators
    processed = processed.replace(/\\succ/g, '≻');
    processed = processed.replace(/\\sim/g, '∼');
    processed = processed.replace(/\\succeq/g, '⪰');
    processed = processed.replace(/\\preceq/g, '⪯');
    
    // Remove dollar signs from simple inline math (single letters/numbers)
    // This handles cases like $A$, $B$, $1$, etc.
    processed = processed.replace(/\$([A-Za-z0-9])\$/g, '$1');
    
    // Handle more complex inline expressions by removing $ but keeping content
    // This is a fallback for any remaining $ expressions
    processed = processed.replace(/\$([^\$]+)\$/g, '$1');
    
    const lines = processed.split('\n');
    const output: string[] = [];
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect lines with slashes and pipes like: / Concept / Scenario / Explanation / | --- |
      if (line.includes('/') && line.includes('|')) {
        // Split by either / or | and clean up
        const parts = line.split(/[\/\|]/)
          .map(p => p.trim())
          .filter(p => p && p !== '---' && p !== '----');
        
        if (parts.length >= 2) {
          if (!inTable) {
            // First row - create header
            output.push('| ' + parts.join(' | ') + ' |');
            // Add separator
            output.push('| ' + parts.map(() => '---').join(' | ') + ' |');
            inTable = true;
          } else {
            // Subsequent rows
            output.push('| ' + parts.join(' | ') + ' |');
          }
          continue;
        }
      } else if (inTable && !line) {
        // Empty line ends table
        inTable = false;
      }
      
      output.push(lines[i]);
    }
    
    return output.join('\n');
  };

  const components = {
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-10 rounded-xl border-2 border-gray-400 shadow-2xl">
        <table className="min-w-full divide-y-2 divide-gray-400" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead className="bg-gradient-to-r from-purple-200 to-blue-200" {...props} />
    ),
    tbody: ({ node, ...props }: any) => (
      <tbody className="bg-white divide-y-2 divide-gray-300" {...props} />
    ),
    tr: ({ node, ...props }: any) => (
      <tr className="hover:bg-blue-50 transition-colors" {...props} />
    ),
    th: ({ node, ...props }: any) => (
      <th className="px-8 py-5 text-left text-lg font-black text-gray-900 uppercase tracking-wide border-r-2 border-gray-300 last:border-r-0" {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td className="px-8 py-5 text-lg text-gray-900 font-medium leading-relaxed border-r border-gray-200 last:border-r-0" {...props} />
    ),
    h1: ({ node, ...props }: any) => (
      <h1 className="text-6xl font-black text-gray-900 mt-12 mb-8 pb-4 border-b-4 border-purple-400" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-5xl font-black text-gray-900 mt-10 mb-6" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className="text-4xl font-bold text-gray-900 mt-8 mb-5" {...props} />
    ),
    h4: ({ node, ...props }: any) => (
      <h4 className="text-3xl font-bold text-gray-800 mt-7 mb-4" {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className="text-xl text-gray-800 leading-relaxed my-6 font-normal" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc list-inside space-y-4 my-8 ml-8 text-xl" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="list-decimal list-inside space-y-4 my-8 ml-8 text-xl" {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li className="text-gray-800 leading-relaxed ml-4 text-xl font-normal" {...props} />
    ),
    code: ({ node, inline, ...props }: any) => 
      inline ? (
        <code className="px-3 py-1 bg-purple-200 text-purple-900 rounded text-lg font-mono font-bold" {...props} />
      ) : (
        <code className="block p-8 bg-gray-900 text-green-400 rounded-xl text-lg font-mono overflow-x-auto my-8 leading-relaxed" {...props} />
      ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote className="border-l-8 border-purple-600 pl-8 py-4 my-8 italic text-gray-800 bg-purple-100 rounded-r-lg text-xl" {...props} />
    ),
    a: ({ node, ...props }: any) => (
      <a className="text-purple-700 hover:text-purple-900 underline text-xl font-semibold" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    hr: ({ node, ...props }: any) => (
      <hr className="my-12 border-t-4 border-gray-400" {...props} />
    ),
    strong: ({ node, ...props }: any) => (
      <strong className="font-black text-gray-900" {...props} />
    ),
    em: ({ node, ...props }: any) => (
      <em className="italic text-gray-800 font-medium" {...props} />
    ),
    img: ({ node, ...props }: any) => (
      <img className="max-w-full h-auto rounded-xl shadow-2xl my-8" {...props} />
    ),
  };

  const processedContent = preprocessContent(content);

  return (
    <div className="prose prose-2xl max-w-none">
      <ReactMarkdown 
        components={components}
        remarkPlugins={[remarkGfm]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default IntelligentMarkdown;