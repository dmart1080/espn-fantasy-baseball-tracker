import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * Sparkline - compact trend chart for table cells
 * Props:
 *   data     - array of numbers OR array of {value: number}
 *   color    - stroke color (default auto based on trend)
 *   width    - container width (default 80)
 *   height   - container height (default 32)
 *   label    - tooltip label prefix
 */
export default function Sparkline({ data = [], color, width = 80, height = 32, label = 'Value' }) {
  if (!data || data.length < 2) {
    return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
  }

  const normalized = data.map((d, i) => ({
    i,
    value: typeof d === 'object' ? d.value : d,
  }));

  const first = normalized[0].value;
  const last = normalized[normalized.length - 1].value;
  const trend = last - first;

  const autoColor = color || (
    trend > 0 ? 'var(--green)' :
    trend < 0 ? 'var(--red)' :
    'var(--text-muted)'
  );

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={normalized} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={autoColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 11,
            padding: '4px 8px',
          }}
          labelFormatter={(i) => `Day ${i + 1}`}
          formatter={(v) => [`${Number(v).toFixed(3)}`, label]}
          cursor={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
