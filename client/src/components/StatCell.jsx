import { getStatTier, tierToClass, formatStat } from '../utils/statColors.js'

/**
 * StatCell - colors a stat value based on MLB percentile thresholds
 * Props:
 *   value    - numeric stat value
 *   stat     - stat key (e.g. "xBA", "ERA", "barrel_pct")
 *   percentile - optional 0-100 percentile override
 *   isPitcher - use pitcher thresholds for shared stats
 *   className - extra class names
 */
export default function StatCell({ value, stat, percentile, isPitcher = false, className = '' }) {
  let tier;

  if (percentile !== undefined && percentile !== null) {
    // Use explicit percentile
    if (percentile >= 80) tier = 'elite';
    else if (percentile >= 60) tier = 'above-avg';
    else if (percentile >= 40) tier = 'avg';
    else if (percentile >= 20) tier = 'below-avg';
    else tier = 'poor';
  } else {
    tier = getStatTier(stat?.toLowerCase(), value, isPitcher);
  }

  const tierClass = tierToClass(tier);
  const display = formatStat(stat?.toLowerCase(), value);

  return (
    <span className={`stat-cell ${tierClass} ${className}`} title={`${stat}: ${display} (${tier})`}>
      {display}
    </span>
  );
}
