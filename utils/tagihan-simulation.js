function simulateTagihan(month = "JANUARI") {
  const activeSS = SpreadsheetApp.getActiveSpreadsheet();

  // ✅ get last sheet safely (without mutating array)
  const sheets = activeSS.getSheets();
  const sourceSheet = sheets[sheets.length - 1];

  const sourceData = sourceSheet.getDataRange().getValues();
  const sourceDataHeader = sourceData[0];

  const sourceDataColumn = _getColumnIndex(sourceDataHeader);

  sourceDataHeader.splice(
    sourceDataColumn["KOLEKTIBILITAS"],
    0,
    "HITUNGAN DISKOP",
  );

  // ✅ fix target sheet creation
  const targetSheet =
    activeSS.getSheetByName(month) || activeSS.insertSheet(month);

  let simData = [];

  // ✅ keep header
  simData.push(sourceDataHeader);

  for (let i = 1; i < sourceData.length; i++) {
    const { debitur } = _simulateTagihanDebitur(
      sourceData[i],
      sourceDataColumn,
    );

    simData.push(debitur);
  }

  // ✅ clear + write result
  targetSheet.clearContents();
  targetSheet
    .getRange(1, 1, simData.length, simData[0].length)
    .setValues(simData);

  // move sheet to last position
  activeSS.setActiveSheet(targetSheet);
  activeSS.moveActiveSheet(activeSS.getSheets().length);
}

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
