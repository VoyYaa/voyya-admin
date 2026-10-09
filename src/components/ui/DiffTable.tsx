import type { JSX } from 'react';
import type { DiffRow } from '../../lib/version-diff';

export interface DiffTableProps {
  rows: readonly DiffRow[];
  beforeLabel?: string;
  afterLabel?: string;
  caption?: string;
}

export function DiffTable({ rows, beforeLabel, afterLabel, caption }: DiffTableProps): JSX.Element {
  const withColumns = beforeLabel !== undefined && afterLabel !== undefined;

  if (withColumns) {
    return (
      <table className="w-full text-small">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col" className="py-1 pr-4 text-left font-bold text-text-muted">
              <span className="sr-only">Campo</span>
            </th>
            <th scope="col" className="py-1 pr-4 text-left font-bold text-text-muted">
              {beforeLabel}
            </th>
            <th scope="col" className="py-1 text-left font-bold text-text-muted">
              {afterLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-1 pr-4 text-left font-normal text-text-muted">
                {row.label}
              </th>
              <td className="py-1 pr-4 text-numeric text-text">{row.before}</td>
              <td className="py-1 text-numeric text-text">{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-small">
      {caption && <caption className="sr-only">{caption}</caption>}
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className="py-1 pr-4 text-left font-normal text-text-muted">
              {row.label}
            </th>
            <td className="py-1 text-numeric text-text">
              {row.before} <span aria-hidden="true">→</span>
              <span className="sr-only"> cambia a </span> {row.after}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
