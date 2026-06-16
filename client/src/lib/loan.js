// Live preview calculator only — once a loan exists server-side, its amortization
// schedule comes from the API (GET /api/loans/:id and /api/customer/loans/:id).
export function calcPMT(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}
