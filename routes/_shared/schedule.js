// ดอกเบี้ยลดต้นลดดอก — ใช้ร่วมกันทั้งฝั่ง admin (routes/loans.js) และลูกหนี้ (routes/customer.js)
function calcPMT(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
}

function generateSchedule(principal, annualRate, months, startDate) {
  const r = annualRate / 100 / 12;
  const pmt = calcPMT(principal, r, months);
  let balance = principal;
  const schedule = [];

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPay = pmt - interest;
    balance = Math.max(0, balance - principalPay);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installment: i,
      dueDate: dueDate.toISOString().split('T')[0],
      payment: Math.round(pmt * 100) / 100,
      principal: Math.round(principalPay * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100
    });
  }
  return schedule;
}

module.exports = { calcPMT, generateSchedule };
