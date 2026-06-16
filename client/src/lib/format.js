export function formatMoney(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

export function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function daysOverdue(dueDate) {
  const diff = new Date() - new Date(dueDate);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const STATUS_BADGES = {
  active: ['badge-active', 'กำลังดำเนินการ'],
  pending: ['badge-pending', 'รอดำเนินการ'],
  closed: ['badge-closed', 'ปิดสัญญา'],
  rejected: ['badge-rejected', 'ปฏิเสธ'],
  'รอตรวจ': ['badge-wait', 'รอตรวจ'],
  'อนุมัติ': ['badge-approved', 'อนุมัติ'],
};
