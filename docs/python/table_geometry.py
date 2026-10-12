"""Reliable ruled-table recovery: suppress diagonal overlays; reconstruct text by glyph position."""
from __future__ import annotations
from bisect import bisect_right
from collections import defaultdict
from dataclasses import dataclass
from statistics import median
import re

SETTINGS = {"vertical_strategy": "lines", "horizontal_strategy": "lines",
            "snap_tolerance": 3, "join_tolerance": 3}


@dataclass
class ExtractedGrid:
    rows: list[list[str]]
    bbox: tuple[float, float, float, float]
    boundaries: tuple[float, ...]


def is_watermark_char(ch):
    if ch.get("object_type") != "char":
        return False
    mat = ch.get("matrix") or (1, 0, 0, 1, 0, 0)
    return (len(mat) >= 4 and max(abs(mat[1]), abs(mat[2])) > 0.06
            and float(ch.get("size", 0)) >= 14)


def clean_page(page):
    removed = sum(is_watermark_char(c) for c in page.chars)
    if not removed:
        return page, 0
    return page.filter(lambda obj: not is_watermark_char(obj)), removed


def _lines(chars):
    groups = []
    for ch in sorted(chars, key=lambda c: (c["top"], c["x0"])):
        if not ch.get("text", "").strip():
            continue
        if groups and abs(ch["top"] - median(x["top"] for x in groups[-1][:3])) <= 2.1:
            groups[-1].append(ch)
        else:
            groups.append([ch])
    return groups


def _line_text(chars):
    result, previous = "", None
    for ch in sorted(chars, key=lambda c: c["x0"]):
        value = ch.get("text", "")
        if not value.strip():
            continue
        if previous:
            gap = ch["x0"] - previous["x1"]
            tolerance = max(1.25, min(previous.get("size", 7), ch.get("size", 7)) * .21)
            if gap >= tolerance and not result.endswith(" "):
                result += " "
        result += value
        previous = ch
    return re.sub(r"[ \t]+", " ", result).strip()


def _cell_text(chars, column):
    chunks = [_line_text(x) for x in _lines(chars)]
    chunks = [x for x in chunks if x]
    if not chunks:
        return ""
    if column == 0 and len(chunks) <= 3 and all(re.fullmatch(r"[A-Za-z0-9]+", x) for x in chunks):
        return "".join(chunks)
    if column == 1 and len(chunks) > 1 and len(chunks[-1]) == 1 and chunks[-1].isalpha():
        chunks[-2] += chunks.pop()
    lines = [chunks[0]]
    for chunk in chunks[1:]:
        if lines[-1].endswith("-") and chunk[0].isalpha():
            lines[-1] += chunk
        else:
            lines.append(chunk)
    return "\n".join(lines)


def _grid_axes(table):
    r = [x for x in table.rows if x.cells and any(c is not None for c in x.cells)]
    if len(r) < 1:
        return [], []
    first = next((x for x in r if all(c is not None for c in x.cells)), None)
    if first is None:
        return [], []
    xs = [c[0] for c in first.cells] + [first.cells[-1][2]]
    ys = [min(c[1] for c in row.cells if c is not None) for row in r]
    ys.append(max(c[3] for c in r[-1].cells if c is not None))
    return xs, ys


def _overlap(a, b):
    x0, y0, x1, y1 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x1 - x0) * max(0, y1 - y0)
    area = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1])-inter
    return inter / area if area else 0


def find_ruled_tables(page):
    clean, filtered_count = clean_page(page)
    try:
        tables = []
        choices = clean.find_tables(table_settings=SETTINGS)
        choices.sort(key=lambda t: (t.bbox[2]-t.bbox[0])*(t.bbox[3]-t.bbox[1]), reverse=True)
        for candidate in choices:
            xs, ys = _grid_axes(candidate)
            if not xs or len(xs) < 3 or len(xs) > 65:
                continue
            if candidate.bbox[2]-candidate.bbox[0] < 150:
                continue
            if any(_overlap(candidate.bbox, prev.bbox) >= .35 for prev in tables):
                continue
            cell_chars = defaultdict(list)
            left, top, right, bottom = candidate.bbox
            for ch in clean.chars:
                cx = (ch["x0"]+ch["x1"])/2
                cy = (ch["top"]+ch["bottom"])/2
                if not (left < cx < right and top < cy < bottom):
                    continue
                col = bisect_right(xs, cx)-1
                row = bisect_right(ys, cy)-1
                if 0 <= row < len(ys)-1 and 0 <= col < len(xs)-1:
                    cell_chars[(row, col)].append(ch)
            rows = [[_cell_text(cell_chars.get((r,c), []), c)
                     for c in range(len(xs)-1)] for r in range(len(ys)-1)]
            if len(xs) - 1 == 13 and all(not row[-1] for row in rows):
                rows = [row[:-1] for row in rows]
                xs = xs[:-1]
            if any(any(value for value in row) for row in rows):
                tables.append(ExtractedGrid(rows, tuple(candidate.bbox), tuple(xs)))
        tables.sort(key=lambda t: (t.bbox[1], t.bbox[0]))
        return tables, filtered_count
    finally:
        if clean is not page:
            clean.flush_cache()


def is_header(row):
    if len(row) < 2:
        return False
    canon = [re.sub(r"\s+", "", str(value)).casefold() for value in row[:2]]
    return canon == ["takipno", "adsoyad"]
