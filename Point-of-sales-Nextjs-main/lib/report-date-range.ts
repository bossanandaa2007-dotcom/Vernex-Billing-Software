export type ReportPreset = 'today' | 'yesterday' | 'last7' | 'month' | 'custom';

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

export function getReportDateRange(url: string) {
  const params = new URL(url).searchParams;
  const preset = (params.get('preset') || 'today') as ReportPreset;
  const now = new Date();
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    start = startOfDay(yesterday);
    end = endOfDay(yesterday);
  } else if (preset === 'last7') {
    start = startOfDay(new Date(now));
    start.setDate(start.getDate() - 6);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = endOfDay(now);
  } else if (preset === 'custom') {
    const from = params.get('from');
    const to = params.get('to');
    if (from) start = startOfDay(new Date(`${from}T00:00:00`));
    if (to) end = endOfDay(new Date(`${to}T00:00:00`));
  }

  return {
    preset,
    start,
    end,
    label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
  };
}

