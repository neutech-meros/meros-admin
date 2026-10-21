import { useTranslation } from 'react-i18next';

export type DrawerBlock =
  | {
      kind: 'kv';
      label: string;
      value: string;
      badge?: boolean;
      toneColor?: string;
      toneBackground?: string;
      numeric?: boolean;
    }
  | {
      kind: 'table';
      columns: string[];
      rows: Array<{
        cells: Array<{
          text: string;
          badge?: boolean;
          toneColor?: string;
          toneBackground?: string;
          numeric?: boolean;
          maxWidth?: string;
        }>;
      }>;
    }
  | { kind: 'timeline'; events: Array<{ title: string; time: string }> }
  | { kind: 'empty'; title: string; description: string; onRetry?: () => void; retryLabel?: string }
  | { kind: 'text'; label: string; value: string }
  | { kind: 'loading'; label: string };

function KvBlock({ block }: { block: Extract<DrawerBlock, { kind: 'kv' }> }) {
  return (
    <div
      className="flex justify-between gap-4 border-b py-2.5 text-[13.5px]"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div style={{ color: 'var(--text-secondary)' }}>{block.label}</div>
      <div className="text-right">
        {block.badge ? (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ color: block.toneColor, background: block.toneBackground }}
          >
            {block.value}
          </span>
        ) : (
          <span className={block.numeric ? 'tabular-nums' : undefined}>{block.value}</span>
        )}
      </div>
    </div>
  );
}

function TableBlock({ block }: { block: Extract<DrawerBlock, { kind: 'table' }> }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {block.columns.map((col) => (
            <th
              key={col}
              className="whitespace-nowrap border-b px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i}>
            {row.cells.map((cell, j) => (
              <td
                key={j}
                className="border-b px-3 py-2.5 align-middle text-[13px]"
                style={{ borderColor: 'var(--border-subtle)', maxWidth: cell.maxWidth }}
              >
                {cell.badge ? (
                  <span
                    className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: cell.toneColor, background: cell.toneBackground }}
                  >
                    {cell.text}
                  </span>
                ) : (
                  <span className={cell.numeric ? 'tabular-nums' : undefined}>{cell.text}</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TimelineBlock({ block }: { block: Extract<DrawerBlock, { kind: 'timeline' }> }) {
  const { t } = useTranslation();

  if (!block.events.length) {
    return (
      <EmptyBlock
        block={{
          kind: 'empty',
          title: t('admin.drawer.noActivityTitle'),
          description: t('admin.drawer.noActivityDescription'),
        }}
      />
    );
  }

  return (
    <div>
      {block.events.map((e, i) => (
        <div key={i} className="flex gap-3 pb-4.5">
          <div className="flex flex-col items-center">
            <div
              className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: 'var(--brand-500)' }}
            />
            <div className="mt-1 w-px flex-1" style={{ background: 'var(--border-subtle)' }} />
          </div>
          <div>
            <div className="text-sm font-medium">{e.title}</div>
            <div className="tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
              {e.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TextBlock({ block }: { block: Extract<DrawerBlock, { kind: 'text' }> }) {
  return (
    <div className="border-b py-2.5 text-[13.5px]" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="mb-1" style={{ color: 'var(--text-secondary)' }}>
        {block.label}
      </div>
      <div>{block.value}</div>
    </div>
  );
}

function EmptyBlock({ block }: { block: Extract<DrawerBlock, { kind: 'empty' }> }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-10 text-center"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div
        className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ background: 'var(--bg-surface)' }}
      >
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          stroke="currentColor"
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 12h-5.4l-1.6 3H9l-1.6-3H2" />
          <path d="M5.5 5h13l3.5 7v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7z" />
        </svg>
      </div>
      <h3 className="mb-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {block.title}
      </h3>
      <p className="max-w-[320px] text-[13px]">{block.description}</p>
      {block.onRetry ? (
        <button
          type="button"
          onClick={block.onRetry}
          className="mt-4 inline-flex items-center rounded-[10px] border px-4 py-2 text-[13.5px] font-medium"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
        >
          {block.retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function DrawerBlocks({ blocks }: { blocks: DrawerBlock[] }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'kv':
            return <KvBlock key={i} block={block} />;
          case 'table':
            return <TableBlock key={i} block={block} />;
          case 'timeline':
            return <TimelineBlock key={i} block={block} />;
          case 'empty':
            return <EmptyBlock key={i} block={block} />;
          case 'loading':
            return (
              <div
                key={i}
                role="status"
                className="px-4 py-10 text-center text-[13.5px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {block.label}
              </div>
            );
          case 'text':
            return <TextBlock key={i} block={block} />;
        }
      })}
    </div>
  );
}
