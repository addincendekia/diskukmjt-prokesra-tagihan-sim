function _getColumnIndex(header) {
  return {
    "NO LOAN": header.indexOf("NO LOAN"),
    NAMA: header.indexOf("NAMA"),
    MULAI: header.indexOf("MULAI"),
    "JATUH TEMPO": header.indexOf("JATUH TEMPO"),
    PLAFOND: header.indexOf("PLAFOND"),
    "JANGKA WAKTU": header.indexOf("JANGKA WAKTU"),
    "TOTAL SUBSIDI BUNGA": header.indexOf("TOTAL SUBSIDI BUNGA"),
    "SISA KREDIT": header.indexOf("SISA KREDIT"),
    "HITUNGAN DISKOP": header.indexOf("TUNGGAKAN BUNGA") + 1,
    KOLEKTIBILITAS: header.indexOf("KOLEKTIBILITAS"),
    KET: header.indexOf("KET"),
  };
}
