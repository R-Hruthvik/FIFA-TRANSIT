import React from 'react';

interface LogItem {
  id: string;
  gate: string;
  message: string;
}

const MOCK_LOGS: LogItem[] = [
  { id: '1', gate: 'Gate A', message: 'Passenger flow smooth' },
  { id: '2', gate: 'Gate B', message: 'Congestion detected' },
  { id: '3', gate: 'Gate C', message: 'Emergency exit opened' },
  { id: '4', gate: 'Gate A', message: 'Wait time: 5 mins' },
];

export const LiveQueryTicker = ({ gateFilter }: { gateFilter: string | null }) => {
  const filteredLogs = gateFilter 
    ? MOCK_LOGS.filter(log => log.gate === gateFilter)
    : MOCK_LOGS;

  return (
    <div className="text-sm space-y-2">
      <h2 className="font-bold border-b border-zinc-700 pb-1">
        Live Log {gateFilter && `(Filtering: ${gateFilter})`}
      </h2>
      {filteredLogs.map(log => (
        <div key={log.id} className="text-xs text-zinc-300">
          <span className="font-mono text-cyan-400">[{log.gate}]</span> {log.message}
        </div>
      ))}
    </div>
  );
};
