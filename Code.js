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
  const rowData = activeSheet
    .getRange(rowSelected, 1, 1, activeSheet.getLastColumn())
    .getValues()[0];

  const { debitur, debiturSchedule, debiturInstallment } =
    _simulateTagihanDebitur(rowData, dataColumn);

  const html = HtmlService.createTemplateFromFile("DialogSimSchedule");
  html.props = {
    debitur: JSON.stringify({
      cabang: debitur[dataColumn["CABANG"]],
      noLoan: debitur[dataColumn["NO LOAN"]],
      nama: debitur[dataColumn["NAMA"]],
      plafond: debitur[dataColumn["PLAFOND"]],
      tenor: debitur[dataColumn["JANGKA WAKTU"]],
      interestTotal: debiturSchedule.interestTotal,
      dateReal: Utilities.formatDate(
        new Date(debitur[dataColumn["MULAI"]]),
        Session.getScriptTimeZone(),
        "dd, MMM yyyy",
      ),
      dateEnd: Utilities.formatDate(
        new Date(debitur[dataColumn["JATUH TEMPO"]]),
        Session.getScriptTimeZone(),
        "dd, MMM yyyy",
      ),
    }),
    schedule: JSON.stringify(debiturSchedule.schedule),
    scheduleInstallment: JSON.stringify(debiturInstallment),
  };

  SpreadsheetApp.getUi().showModalDialog(
    html.evaluate().setWidth(450).setHeight(350),
    `Simulasi Tagihan ${debitur[dataColumn["NAMA"]]}`,
  );
}

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
