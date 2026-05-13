function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 Simulation Tools")
    .addItem("Simulasi Tagihan", "dialogSim")
    .addItem("Simulasi Tagihan Debitur", "dialogSimSchedule")
    .addToUi();
}

function dialogSim() {
  const months = Object.keys(MONTH_MAPPED);

  const activeSS = SpreadsheetApp.getActiveSpreadsheet();

  const sheetLast = _getSheetLast(activeSS);
  const sheetLastName = sheetLast.getName().toUpperCase();
  const sheetLastIndex =
    sheetLastName !== "DEBITUR AKTIF" ? MONTH_MAPPED[sheetLastName] : 0;

  const sheetTarget = months[sheetLastIndex];

  const sheets = activeSS
    .getSheets()
    .filter((sheet) => {
      const sheetName = sheet.getName().toUpperCase();
      const sheetAllowed = ["DEBITUR AKTIF", ...months];

      return sheetAllowed.includes(sheetName);
    })
    .map((sheet) => ({
      name: sheet.getName().toUpperCase(),
    }));

  const html = HtmlService.createTemplateFromFile("ui/DialogSim");
  html.props = {
    sheets: JSON.stringify(sheets),
    sheetLast: sheetLastName,
    sheetTarget,
  };

  SpreadsheetApp.getUi().showModalDialog(
    html.evaluate().setWidth(450).setHeight(350),
    "Simulasi Tagihan",
  );
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
    _simulateTagihanDebitur(rowData, dataColumn, activeSheet.getName());

  const html = HtmlService.createTemplateFromFile("ui/DialogSimSchedule");
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
