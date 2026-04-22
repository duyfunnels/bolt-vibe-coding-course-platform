export function formatVND(n: number | string) {
  const v = typeof n === 'string' ? Number(n) : n;
  return new Intl.NumberFormat('vi-VN').format(v || 0) + ' đ';
}

export function formatDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleString('vi-VN', { hour12: false });
}
