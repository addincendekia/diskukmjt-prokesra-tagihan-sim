function _simulateTagihanDebitur(data, dataColumn) {
  const debitur = [...data]; // clone row (array)

  const colPlafond = debitur[dataColumn["PLAFOND"]];
  const colTenor = debitur[dataColumn["JANGKA WAKTU"]];
  const colPrincipalRemain = debitur[dataColumn["SISA KREDIT"]];
  const colMulai = debitur[dataColumn["MULAI"]];
  const colMulaiParsed =
    colMulai instanceof Date ? colMulai : new Date(colMulai);

  let colPayment = 0;
  let colPrincipalRemainUpdated = colPrincipalRemain;
  let colCollectability = debitur[dataColumn["KOLEKTIBILITAS"]];

  const scheduleParams = {
    principal: Number(colPlafond),
    tenor: Number(colTenor),
    paymentInterval: 1,
  };

  // ✅ year-based logic
  const scheduleGenerated =
    colMulaiParsed.getFullYear() === 2023
      ? generateFlatSchedule(scheduleParams)
      : generateEffectiveSchedule(scheduleParams);

  const debiturInstallment = findSchedule({
    schedule: scheduleGenerated.schedule,
    principalRemain: colPrincipalRemain,
  });

  if (debiturInstallment.index >= 0) {
    colPayment = debiturInstallment.paymentInterest;
    colPrincipalRemainUpdated = debiturInstallment.principalRemaining;

    if (colPrincipalRemainUpdated === 0) {
      colCollectability = "LUNAS";
    }
  }

  // ✅ update values back into array (NOT object)
  debitur[dataColumn["SISA KREDIT"]] = colPrincipalRemainUpdated;
  debitur[dataColumn["KOLEKTIBILITAS"]] = colCollectability;
  debitur.splice(dataColumn["KOLEKTIBILITAS"], 0, colPayment); // col HITUNGAN DISKOP

  return {
    debitur,
    debiturSchedule: scheduleGenerated,
    debiturInstallment,
  };
}
