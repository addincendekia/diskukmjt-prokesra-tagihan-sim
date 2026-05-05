const FILE_ID_SOURCE_RECAP = '1JSvQXVhC6InSpULihdoxNGrIjsoZ5V7OplV5CptWc_c';

const DEFAULT_PERIOD_YEAR = 2026;
const RATE_SUBSIDI = 0.0925;

const MONTH_MAPPED = {
  JANUARI: 1,
  FEBRUARI: 2,
  MARET: 3,
  APRIL: 4,
  MEI: 5,
  JUNI: 6,
  JULI: 7,
  AGUSTUS: 8,
  SEPTEMBER: 9,
  OKTOBER: 10,
  NOVEMBER: 11,
  DESEMBER: 12,
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 Simulation Tools")
    .addItem("Simulasi Tagihan Debitur", "dialogSimSchedule")
    .addToUi();
}

function dialogSimSchedule() {
  const activeSS = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = activeSS.getActiveSheet();
  const activeRange = activeSheet.getActiveRange();
  
  if (!activeRange) return;

  const dataHeader = activeSheet
    .getRange(1, 1, 1, activeSheet.getLastColumn())
    .getValues()[0];

  const dataColumn = _getColumnIndex(dataHeader);

  const rowSelected = activeRange.getRow();
  const rowData = activeSheet.getRange(rowSelected, 1, 1, activeSheet.getLastColumn()).getValues()[0];

  const { debitur, debiturSchedule, debiturInstallment } = _simulateTagihanDebitur(rowData, dataColumn);

  const html = HtmlService.createTemplateFromFile("DialogSimSchedule");
  html.props = {
    debitur: JSON.stringify({
      cabang: debitur[dataColumn['CABANG']],
      noLoan: debitur[dataColumn['NO LOAN']],
      nama: debitur[dataColumn['NAMA']],
      plafond: debitur[dataColumn['PLAFOND']],
      tenor: debitur[dataColumn['JANGKA WAKTU']],
      interestTotal: debiturSchedule.interestTotal,
      dateReal: Utilities.formatDate(
        new Date(debitur[dataColumn['MULAI']]),
        Session.getScriptTimeZone(),
        "dd, MMM yyyy"
      ),
      dateEnd: Utilities.formatDate(
        new Date(debitur[dataColumn['JATUH TEMPO']]),
        Session.getScriptTimeZone(),
        "dd, MMM yyyy"
      ),
    }),
    schedule: JSON.stringify(debiturSchedule.schedule),
    scheduleInstallment: JSON.stringify(debiturInstallment),
  };

  SpreadsheetApp.getUi().showModalDialog(
    html.evaluate().setWidth(450).setHeight(350),
    `Simulasi Tagihan ${debitur[dataColumn['NAMA']]}`,
  );
}

function generateEffectiveSchedule({ principal, tenor, paymentInterval = 1 }) {
  const installments = tenor / paymentInterval;

  const principalInstallment = principal / installments;
  // hitung effective rate (identik Excel)
  const principalRemaining = (principal * (installments + 1)) / 2;

  // total bunga flat
  const interestTotal = ((principal * RATE_SUBSIDI) / 12) * tenor;

  const rateEffective = (interestTotal * 12) / paymentInterval / principalRemaining;
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
  const paymentInterest = Math.round(((principal * RATE_SUBSIDI) / 12) * paymentInterval);

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
    interestRate: RATE_SUBSIDI,
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

function simulateTagihan(month = 'JANUARI') {
  const activeSS = SpreadsheetApp.getActiveSpreadsheet();

  // ✅ get last sheet safely (without mutating array)
  const sheets = activeSS.getSheets();
  const sourceSheet = sheets[sheets.length - 1];

  const sourceData = sourceSheet.getDataRange().getValues();
  const sourceDataHeader = sourceData[0];

  const sourceDataColumn = _getColumnIndex(sourceDataHeader);

  sourceDataHeader.splice(sourceDataColumn["KOLEKTIBILITAS"], 0, 'HITUNGAN DISKOP');

  // ✅ fix target sheet creation
  const targetSheet = activeSS.getSheetByName(month) || activeSS.insertSheet(month);
  
  let simData = [];
  // ✅ keep header
  simData.push(sourceDataHeader);

  for (let i = 1; i < sourceData.length; i++) {
    const debitur = [...sourceData[i]]; // clone row (array)

    const colPlafond = debitur[sourceDataColumn["PLAFOND"]];
    const colTenor = debitur[sourceDataColumn["JANGKA WAKTU"]];
    const colPrincipalRemain = debitur[sourceDataColumn["SISA KREDIT"]];
    const colMulai = debitur[sourceDataColumn["MULAI"]];
    const colMulaiParsed = colMulai instanceof Date ? colMulai : new Date(colMulai);

    let colPayment = 0;
    let colPrincipalRemainUpdated = colPrincipalRemain;
    let colCollectability = debitur[sourceDataColumn["KOLEKTIBILITAS"]];

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
    debitur[sourceDataColumn["SISA KREDIT"]] = colPrincipalRemainUpdated;
    debitur[sourceDataColumn["KOLEKTIBILITAS"]] = colCollectability;
    debitur.splice(sourceDataColumn["KOLEKTIBILITAS"], 0, colPayment); // col HITUNGAN DISKOP

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
  const colMulaiParsed = colMulai instanceof Date ? colMulai : new Date(colMulai);

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
    debiturInstallment
  };
}

function _getColumnIndex(header) {
  return {
    "NO LOAN": header.indexOf("NO LOAN"),
    NAMA: header.indexOf("NAMA"),
    MULAI: header.indexOf("MULAI"),
    "JATUH TEMPO": header.indexOf("JATUH TEMPO"),
    "PLAFOND": header.indexOf("PLAFOND"),
    "JANGKA WAKTU": header.indexOf("JANGKA WAKTU"),
    "TOTAL SUBSIDI BUNGA": header.indexOf("TOTAL SUBSIDI BUNGA"),
    "SISA KREDIT": header.indexOf("SISA KREDIT"),
    "HITUNGAN DISKOP": header.indexOf("TUNGGAKAN BUNGA") + 1,
    "KOLEKTIBILITAS": header.indexOf("KOLEKTIBILITAS"),
    KET: header.indexOf("KET"),
  };
}
