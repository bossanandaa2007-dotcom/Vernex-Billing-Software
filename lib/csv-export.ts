const escapeCsv = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: string[]) {
  const headers = columns ?? Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  return [headers.join(','), ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(','))].join('\n');
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}

