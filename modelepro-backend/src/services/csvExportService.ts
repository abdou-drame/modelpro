import { Response } from 'express';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const escapeCsvField = (value: string | number | null | undefined): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Export CSV générique (ROADMAP_BACKEND.md §7.6 "export CSV/Excel"). Un CSV s'ouvre nativement
// dans Excel/LibreOffice — pas de dépendance supplémentaire pour un .xlsx natif (limite assumée,
// voir JOURNAL.md). BOM UTF-8 ajouté pour qu'Excel affiche correctement les accents.
export const toCsv = <T>(rows: T[], columns: Array<CsvColumn<T>>): string => {
  const header = columns.map((c) => escapeCsvField(c.header)).join(';');
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(c.value(row))).join(';'));
  return '﻿' + [header, ...lines].join('\r\n');
};

export const sendCsv = (res: Response, filename: string, content: string): void => {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.status(200).send(content);
};
