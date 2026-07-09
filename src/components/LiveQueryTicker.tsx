'use client';
import { useState } from 'react';

const initialQueries = [
  { id: 1, gate: 'Gate A', content: 'Entry slow', time: '10:00' },
  { id: 2, gate: 'Gate C', content: 'Blocked aisle', time: '10:05' },
];

export const LiveQueryTicker = ({ gateFilter }: { gateFilter: string | null }) => {
  const [queries] = useState(initialQueries);
  const filtered = gateFilter ? queries.filter(q => q.gate === gateFilter) : queries;
  return (
    <ul className="space-y-2">
      {filtered.map(q => <li key={q.id} className="border-b border-slate-700 p-2">{q.time} - {q.gate}: {q.content}</li>)}
    </ul>
  );
};
