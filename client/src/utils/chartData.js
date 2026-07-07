import { getAggregate } from '../api/api';

export function getRangeConfig(range) {
  const now = new Date();

  switch (range) {
    case 'live':
      return { hours: 1, interval: 'minute', from: new Date(now - 3600000), to: now };
    case '12h':
      return { hours: 12, interval: 'hour', from: new Date(now - 12 * 3600000), to: now };
    case '24h':
      return { hours: 24, interval: 'hour', from: new Date(now - 24 * 3600000), to: now };
    case '7d':
      return { hours: 7 * 24, interval: 'day', from: new Date(now - 7 * 24 * 3600000), to: now };
    case '30d':
      return { hours: 30 * 24, interval: 'day', from: new Date(now - 30 * 24 * 3600000), to: now };
    default:
      return { hours: 1, interval: 'minute', from: new Date(now - 3600000), to: now };
  }
}

export function getCustomRangeConfig(from, to) {
  const hours = Math.max(0, (to - from) / 3600000);
  let interval = 'day';

  if (hours < 2) interval = 'minute';
  else if (hours <= 48) interval = 'hour';

  return { hours, interval, from, to };
}

export async function fetchChartData(roomId, rangeConfig) {
  const { data } = await getAggregate({
    roomId: roomId || undefined,
    from: rangeConfig.from.toISOString(),
    to: rangeConfig.to.toISOString(),
    interval: rangeConfig.interval,
  });

  return data;
}

export function hasChartData(data) {
  if (!data?.length) return false;
  return data.some((d) => d.value != null);
}

export function toChartPoints(data) {
  return data
    .filter((d) => d.value != null)
    .map((d) => ({
      timestamp: new Date(d.timestamp).getTime(),
      value: d.value,
    }));
}
