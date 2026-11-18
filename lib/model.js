export const MILE = 1.609344;
export const KCAL_PER_LITRE = 5;
export const REST_VO2 = 3.5;
export const LIMITS = { run: [5, 25], bike: [50, 550] };
export const RUN_UNITS = { paceKm: 'min/km', paceMi: 'min/mi', kmh: 'km/h', mph: 'mph' };
export const BIKE_UNITS = { watts: 'W', wattsKg: 'W/kg' };
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function initialState() {
  const settings = (intensity, unit) => ({
    intensity, unit, max: 55, minutes: 60, distanceKm: 10, sessionMode: 'time',
    lt1: { mode: 'percent', value: 70 }, lt2: { mode: 'percent', value: 85 }
  });
  return { sport: 'run', weight: 70, run: { ...settings(12, 'paceKm'), economy: 200 },
    bike: { ...settings(200, 'watts'), efficiency: 22 }, oxygenUnit: 'relative' };
}

export function estimate(sport, profile, weight, intensity = profile.intensity) {
  let absolute, kcalHour;
  if (sport === 'run') {
    const relative = REST_VO2 + profile.economy * intensity / 60;
    absolute = relative * weight / 1000;
    kcalHour = absolute * KCAL_PER_LITRE * 60;
  } else {
    kcalHour = intensity * 3600 / (4184 * profile.efficiency / 100);
    absolute = kcalHour / (KCAL_PER_LITRE * 60);
  }
  const relative = absolute * 1000 / weight;
  const minutes = sport === 'run' && profile.sessionMode === 'distance'
    ? profile.distanceKm / intensity * 60 : profile.minutes;
  return { absolute, relative, percent: relative / profile.max * 100, kcalHour,
    minutes, total: kcalHour * minutes / 60 };
}

export function thresholdIntensity(sport, profile, weight, threshold) {
  if (threshold.mode === 'workload') return threshold.value;
  const relative = threshold.mode === 'percent' ? profile.max * threshold.value / 100 : threshold.value;
  if (sport === 'run') return (relative - REST_VO2) * 60 / profile.economy;
  const kcalHour = relative * weight / 1000 * KCAL_PER_LITRE * 60;
  return kcalHour * 4184 * profile.efficiency / 100 / 3600;
}

export function clock(seconds) {
  const rounded = Math.round(seconds);
  return Math.floor(rounded / 60) + ':' + String(rounded % 60).padStart(2, '0');
}

export function formatIntensity(intensity, unit, weight) {
  if (unit === 'paceKm') return clock(3600 / intensity);
  if (unit === 'paceMi') return clock(3600 * MILE / intensity);
  if (unit === 'watts') return String(Math.round(intensity));
  if (unit === 'wattsKg') return (intensity / weight).toFixed(2);
  return (unit === 'mph' ? intensity / MILE : intensity).toFixed(1);
}

export function parseIntensity(raw, unit, weight) {
  if (!String(raw).trim()) return NaN;
  if (unit === 'paceKm' || unit === 'paceMi') {
    const match = String(raw).trim().match(/^(\d{1,2}):([0-5]\d)$/);
    if (!match) return NaN;
    const seconds = Number(match[1]) * 60 + Number(match[2]);
    return seconds > 0 ? 3600 * (unit === 'paceMi' ? MILE : 1) / seconds : NaN;
  }
  const value = Number(raw);
  if (unit === 'wattsKg') return value * weight;
  return unit === 'mph' ? value * MILE : value;
}

export function nextIntensity(sport, unit, intensity, delta, weight) {
  if (unit === 'paceKm' || unit === 'paceMi') {
    const factor = unit === 'paceMi' ? MILE : 1;
    return 3600 * factor / (Math.round(3600 * factor / intensity) - delta * 5);
  }
  if (sport === 'bike') return intensity + delta * (unit === 'wattsKg' ? weight * 0.1 : 5);
  return intensity + delta * 0.1 * (unit === 'mph' ? MILE : 1);
}

export function restore(raw) {
  const defaults = initialState();
  if (!raw || typeof raw !== 'object') return defaults;
  const valid = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
  if (raw.sport === 'bike') defaults.sport = 'bike';
  if (valid(raw.weight, 25, 250)) defaults.weight = raw.weight;
  if (['absolute','percent'].includes(raw.oxygenUnit)) defaults.oxygenUnit = raw.oxygenUnit;
  for (const sport of ['run','bike']) {
    const profile = defaults[sport], saved = raw[sport] || {};
    if (Object.hasOwn(sport === 'run' ? RUN_UNITS : BIKE_UNITS, saved.unit)) profile.unit = saved.unit;
    const bounds = { intensity: LIMITS[sport], max: [15,110], minutes: [1,1440],
      distanceKm: [0.1,500], economy: [120,350], efficiency: [12,32] };
    for (const [key, [lo,hi]] of Object.entries(bounds)) {
      if (Object.hasOwn(profile,key) && valid(saved[key],lo,hi)) profile[key] = saved[key];
    }
    if (sport === 'run' && saved.sessionMode === 'distance') profile.sessionMode = 'distance';
    for (const key of ['lt1','lt2']) {
      const t = saved[key];
      if (!t || !['workload','relative','percent'].includes(t.mode)) continue;
      const range = t.mode === 'workload' ? LIMITS[sport] : t.mode === 'relative' ? [5,110] : [10,99];
      if (valid(t.value, ...range)) profile[key] = { mode: t.mode, value: t.value };
    }
  }
  return defaults;
}
