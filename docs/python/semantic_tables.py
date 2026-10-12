"""Traceable table interpretation; never replace or discard raw table cells.

This is an offline, deterministic approximation to semantic understanding.
Every entry in the structured view points to its original table row/column.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from openpyxl.styles import Alignment, Font, PatternFill

_NUMBER = re.compile(r"^[+-]?(?:\d[\d\s.,%()/:-]*|[#]+)$")


@dataclass(frozen=True)
class TableCellRecord:
    row: int
    column: int
    value: str
    header: str
    role: str
    confidence: str


def _text(value: object) -> str:
    return str(value or "").strip()


def _potential_heading(row: list[str]) -> bool:
    nonempty = [_text(x) for x in row if _text(x)]
    if len(nonempty) < 2:
        return False
    return sum(bool(re.search(r"[^\W\d_]", x, flags=re.UNICODE)) and
               not bool(_NUMBER.fullmatch(x)) for x in nonempty) >= max(2, int(len(nonempty) * 0.65))


def structured_cells(rows: list[list[str]]) -> list[TableCellRecord]:
    """Reversible long-form table, with low-risk header annotation.

    Never invents missing cells, repeats or fills spanning labels, or converts
    source identifiers to numbers. Values remain byte-for-byte from extraction.
    """
    if not rows:
        return []
    header_index = None
    # Some documents use a merged title row before the actual table headings.
    # Candidate has at least 2 textual entries and there must be data below.
    for index in range(min(3, len(rows)-1)):
        if _potential_heading(rows[index]):
            header_index = index
            break
    width = max(len(r) for r in rows)
    headers = [_text(v) for v in rows[header_index]] if header_index is not None else []
    records = []
    for ri, row in enumerate(rows, start=1):
        for ci, value in enumerate(row, start=1):
            value = _text(value)
            if not value:
                continue
            if header_index is not None and ri==header_index+1:
                role,confidence,header="Başlık (öneri)","Orta",""
            elif header_index is not None and ri>header_index+1:
                header = headers[ci-1] if ci-1 < len(headers) else ""
                role = "Değer"
                confidence = "Orta" if header else "Düşük"
            else:
                role,confidence,header="Kaynak veri","Düşük",""
            records.append(TableCellRecord(ri,ci,value,header,role,confidence))
    return records


def append_structured_sheet(workbook, rows: list[list[str]], number: int):
    """Non-destructive audit-friendly view of the original table."""
    entries = structured_cells(rows)
    if not entries:
        return None
    if len(workbook.worksheets)>=100:
        return None
    sheet=workbook.create_sheet(f"Veriler_{number}")
    titles=("Kaynak satır","Kaynak sütun","Alan başlığı (öneri)",
            "Hücre değeri","Tür","Güven")
    sheet.append(titles)
    for cell in sheet[1]:
        cell.fill=PatternFill("solid",fgColor="153550")
        cell.font=Font(name="Aptos",bold=True,color="FFFFFF")
        cell.alignment=Alignment(vertical="center",wrap_text=True)
    for name,width in (("A",16),("B",16),("C",45),("D",76),("E",18),("F",13)):
        sheet.column_dimensions[name].width=width
    sheet.row_dimensions[1].height=29
    for record in entries:
        sheet.append((record.row,record.column,record.header,
                      record.value,record.role,record.confidence))
        for cell in sheet[sheet.max_row][2:]:
            cell.data_type="s"
            cell.alignment=Alignment(vertical="top",wrap_text=True)
    sheet.sheet_view.showGridLines=False
    sheet.freeze_panes="A2"
    sheet.auto_filter.ref=sheet.dimensions
    return sheet
