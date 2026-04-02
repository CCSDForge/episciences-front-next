import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { PluggableList } from 'unified';
import './MarkdownRenderer.scss';

export interface MarkdownRendererProps {
  children: string;
  components?: Components;
  remarkPlugins?: PluggableList;
  urlTransform?: (url: string) => string;
}

const DEFAULT_COMPONENTS: Components = {
  table: ({ children }) => (
    <div className="markdown-table-wrapper" tabIndex={0}>
      <table className="markdown-table">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th scope="col" style={style}>
      {children}
    </th>
  ),
};

/**
 * Shared markdown renderer with GFM support (tables, strikethrough, task lists, etc.)
 * Provides accessible, styled table rendering out of the box.
 * Custom component mappings can be passed via `components` — they are merged with defaults,
 * so overriding `table` or `th` is only needed when non-default behaviour is required.
 */
export default function MarkdownRenderer({
  children,
  components,
  remarkPlugins = [],
  urlTransform,
}: MarkdownRendererProps): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, ...remarkPlugins]}
      components={{ ...DEFAULT_COMPONENTS, ...components }}
      urlTransform={urlTransform}
    >
      {children}
    </ReactMarkdown>
  );
}
