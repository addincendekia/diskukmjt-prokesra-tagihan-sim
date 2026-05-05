function generateEffectiveSchedule({ principal, tenor, paymentInterval = 1 }) {
  const installments = tenor / paymentInterval;

  const principalInstallment = principal / installments;
  // hitung effective rate (identik Excel)
  const principalRemaining = (principal * (installments + 1)) / 2;

  // total bunga flat
  const interestTotal = ((principal * DEFAULT_RATE_SUBSIDI) / 12) * tenor;

  const rateEffective =
    (interestTotal * 12) / paymentInterval / principalRemaining;
  const rateMonthly = rateEffective / 12;

  const schedule = [];
  let principalRemain = principal;

  for (let i = 1; i <= installments; i++) {
    const principalBefore = principalRemain;
    const principalPayment = principalInstallment;

    const paymentInterest = principalBefore * rateEffective * paymentInterval;
    // const paymentInterest = principalBefore * rateMonthly * paymentInterval;
    // const paymentTotal = principalPayment + paymentInterest;

    principalRemain -= principalPayment;

    schedule.push({
      installment: i,
      principalBefore: principalBefore,
      principalPayment: principalPayment,
      principalRemaining: Math.max(0, principalRemain),
      paymentInterest: paymentInterest,
      //   paymentTotal: paymentTotal
    });
  }

  return {
    interestTotal,
    interestRate: rateEffective,
    schedule,
  };
}

function generateFlatSchedule({ principal, tenor, paymentInterval = 1 }) {
  const installments = tenor / paymentInterval;

  // validasi
  if (tenor % paymentInterval !== 0) {
    throw new Error("Tenor harus habis dibagi paymentInterval");
  }

  const principalInstallment = principal / installments;

  // bunga flat per periode (tetap)
  const paymentInterest = Math.round(
    ((principal * DEFAULT_RATE_SUBSIDI) / 12) * paymentInterval,
  );

  const interestTotal = paymentInterest * installments;

  let principalRemain = principal;

  const schedule = [];

  for (let i = 1; i <= installments; i++) {
    const principalBefore = principalRemain;

    const principalPayment = principalInstallment;

    const paymentTotal = principalPayment + paymentInterest;

    principalRemain -= principalPayment;

    schedule.push({
      installment: i,
      principalBefore: principalBefore,
      principalPayment: principalPayment,
      principalRemaining: Math.max(0, principalRemain),
      paymentInterest: paymentInterest,
      paymentTotal: paymentTotal,
    });
  }

  return {
    interestTotal,
    interestRate: DEFAULT_RATE_SUBSIDI,
    schedule,
  };
}

function findSchedule({ schedule, principalRemain, tolerance = 0.15 }) {
  const index = schedule.findIndex(({ principalBefore }) => {
    return Math.abs(principalBefore - principalRemain) < tolerance;
  });

  if (index < 0) return { index };

  if (!schedule[index + 1]) return { index };

  return { index, ...schedule[index + 1] };
}
