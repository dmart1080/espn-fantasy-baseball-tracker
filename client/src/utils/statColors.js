/**
 * Returns a tier string based on stat value and MLB percentile thresholds.
 * Tiers: "elite" | "above-avg" | "avg" | "below-avg" | "poor"
 */

const THRESHOLDS = {
  // Batting - higher is better
  xba: {
    elite: 0.290, aboveAvg: 0.270, belowAvg: 0.240, poor: 0.220,
    higherIsBetter: true,
  },
  xwoba: {
    elite: 0.370, aboveAvg: 0.340, belowAvg: 0.310, poor: 0.290,
    higherIsBetter: true,
  },
  xslg: {
    elite: 0.500, aboveAvg: 0.440, belowAvg: 0.370, poor: 0.330,
    higherIsBetter: true,
  },
  barrel_pct: {
    elite: 12, aboveAvg: 8, belowAvg: 5, poor: 3,
    higherIsBetter: true,
  },
  hard_hit_pct: {
    elite: 45, aboveAvg: 40, belowAvg: 34, poor: 29,
    higherIsBetter: true,
  },
  avg_exit_velocity: {
    elite: 92, aboveAvg: 90, belowAvg: 87, poor: 85,
    higherIsBetter: true,
  },
  sprint_speed: {
    elite: 29.5, aboveAvg: 28, belowAvg: 27, poor: 26,
    higherIsBetter: true,
  },
  iso: {
    elite: 0.220, aboveAvg: 0.170, belowAvg: 0.120, poor: 0.080,
    higherIsBetter: true,
  },
  bb_pct: {
    elite: 12, aboveAvg: 9, belowAvg: 7, poor: 5,
    higherIsBetter: true,
  },
  // k_pct - lower is better for batters
  k_pct: {
    elite: 14, aboveAvg: 18, belowAvg: 24, poor: 28,
    higherIsBetter: false,
  },
  babip: {
    elite: 0.330, aboveAvg: 0.305, belowAvg: 0.285, poor: 0.265,
    higherIsBetter: true,
  },
  // Traditional batting
  ba: {
    elite: 0.300, aboveAvg: 0.275, belowAvg: 0.240, poor: 0.215,
    higherIsBetter: true,
  },
  avg: {
    elite: 0.300, aboveAvg: 0.275, belowAvg: 0.240, poor: 0.215,
    higherIsBetter: true,
  },

  // Pitching - lower is generally better
  era: {
    elite: 3.00, aboveAvg: 3.60, belowAvg: 4.50, poor: 5.50,
    higherIsBetter: false,
  },
  xera: {
    elite: 3.00, aboveAvg: 3.60, belowAvg: 4.50, poor: 5.50,
    higherIsBetter: false,
  },
  fip: {
    elite: 3.00, aboveAvg: 3.60, belowAvg: 4.50, poor: 5.50,
    higherIsBetter: false,
  },
  whip: {
    elite: 1.00, aboveAvg: 1.15, belowAvg: 1.35, poor: 1.55,
    higherIsBetter: false,
  },
  // k_pct for pitchers - higher is better
  pitcher_k_pct: {
    elite: 30, aboveAvg: 25, belowAvg: 20, poor: 16,
    higherIsBetter: true,
  },
  csw_pct: {
    elite: 30, aboveAvg: 27, belowAvg: 24, poor: 21,
    higherIsBetter: true,
  },
  bb_pct_pitcher: {
    elite: 5, aboveAvg: 7, belowAvg: 9, poor: 11,
    higherIsBetter: false,
  },
  // pitcher xba/xwoba - lower is better
  pitcher_xba: {
    elite: 0.215, aboveAvg: 0.230, belowAvg: 0.255, poor: 0.275,
    higherIsBetter: false,
  },
  pitcher_xwoba: {
    elite: 0.280, aboveAvg: 0.310, belowAvg: 0.340, poor: 0.360,
    higherIsBetter: false,
  },
};

/**
 * Get color tier for a stat value
 * @param {string} stat - stat key from THRESHOLDS
 * @param {number} value - numeric value
 * @param {boolean} [isPitcher] - use pitcher thresholds for shared stats like k_pct
 * @returns {"elite"|"above-avg"|"avg"|"below-avg"|"poor"}
 */
export function getStatTier(stat, value, isPitcher = false) {
  if (value === null || value === undefined || isNaN(value)) return 'avg';

  // Resolve pitcher-specific overrides
  let key = stat;
  if (isPitcher) {
    if (stat === 'k_pct') key = 'pitcher_k_pct';
    if (stat === 'xba') key = 'pitcher_xba';
    if (stat === 'xwoba') key = 'pitcher_xwoba';
    if (stat === 'bb_pct') key = 'bb_pct_pitcher';
  }

  const t = THRESHOLDS[key];
  if (!t) return 'avg';

  const v = parseFloat(value);

  if (t.higherIsBetter) {
    if (v >= t.elite) return 'elite';
    if (v >= t.aboveAvg) return 'above-avg';
    if (v >= t.belowAvg) return 'avg';
    if (v >= t.poor) return 'below-avg';
    return 'poor';
  } else {
    if (v <= t.elite) return 'elite';
    if (v <= t.aboveAvg) return 'above-avg';
    if (v <= t.belowAvg) return 'avg';
    if (v <= t.poor) return 'below-avg';
    return 'poor';
  }
}

/**
 * CSS class name for a tier
 */
export function tierToClass(tier) {
  const map = {
    'elite': 'stat-elite',
    'above-avg': 'stat-above-avg',
    'avg': 'stat-avg',
    'below-avg': 'stat-below-avg',
    'poor': 'stat-poor',
  };
  return map[tier] || 'stat-avg';
}

/**
 * Format a stat value for display
 */
export function formatStat(stat, value) {
  if (value === null || value === undefined || value === '') return '—';
  const v = parseFloat(value);
  if (isNaN(v)) return value;

  const threeDecimal = ['xba', 'xwoba', 'xslg', 'woba', 'slg', 'ba', 'avg', 'babip', 'iso'];
  const twoDecimal = ['era', 'xera', 'fip', 'whip'];
  const oneDecimal = ['barrel_pct', 'hard_hit_pct', 'k_pct', 'bb_pct', 'csw_pct', 'avg_exit_velocity', 'sprint_speed'];

  if (threeDecimal.includes(stat)) {
    return v.toFixed(3).replace(/^0/, '');
  }
  if (twoDecimal.includes(stat)) return v.toFixed(2);
  if (oneDecimal.includes(stat)) return v.toFixed(1) + (stat.endsWith('pct') ? '%' : '');

  // Integer stats
  return Math.round(v).toString();
}

export default { getStatTier, tierToClass, formatStat };
