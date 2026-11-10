import React, { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  defaultAgent?: string;
  onClose: () => void;
  onTaskDispatched: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  defaultAgent,
  onClose,
  onTaskDispatched,
}) => {
  const [namespace, setNamespace] = useState('crypto.lattice.verify');
  const [priority, setPriority] = useState(85);
  const [assignedAgent, setAssignedAgent] = useState('agent-sentinel');
  const [actionPayload, setActionPayload] = useState(
    'Verify ML-KEM-768 polynomial ring encapsulation invariants and sign Merkle audit proof.'
  );
  const [agents, setAgents] = useState<Array<{ id: string; role: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultAgent) {
        setAssignedAgent(defaultAgent);
      }
      fetch('/api/agents')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setAgents(data);
        })
        .catch((err) => console.error(err));
    }
  }, [isOpen, defaultAgent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace,
          priority: Number(priority),
          assignedAgent,
          payload: { directive: actionPayload, timestamp: Date.now() },
        }),
      });
      onTaskDispatched();
      onClose();
    } catch (err) {
      console.error('Failed to dispatch task', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 block">
              SOVEREIGN TASK SCHEDULER
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Dispatch Task Directive
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
              EXECUTION NAMESPACE
            </label>
            <input
              type="text"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                PRIORITY WEIGHT (1-100)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                min={1}
                max={100}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                TARGET PARLIAMENT NODE
              </label>
              <select
                value={assignedAgent}
                onChange={(e) => setAssignedAgent(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
              DIRECTIVE PAYLOAD
            </label>
            <textarea
              value={actionPayload}
              onChange={(e) => setActionPayload(e.target.value)}
              rows={3}
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? 'Dispatching...' : 'Dispatch Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
