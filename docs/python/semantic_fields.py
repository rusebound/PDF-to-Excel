"""Conservative key-value extraction from selectable PDF form text.

No model inference, identity-field assumptions, or network access.
All extracted values are traceable to the original page text. The source text
sheet remains authoritative and these fields are additional structured views.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
from statistics import median


@dataclass(frozen=True)
class Field:
    label: str
    value: str
    top: float
    left: float
    source: str
    confidence: str
    method: str


_SEPARATORS = re.compile(r"\s*[:：]\s*")
_URL = re.compile(r"(?i)\b(?:https?://|www\.)")
_LETTER = re.compile(r"[^\W\d_]", re.UNICODE)


def _clean(text: str) -> str:
    return " ".join(str(text).replace("\x00", "").split())


def _valid(label: str, value: str) -> bool:
    if not (2 <= len(label) <= 72 and 1 <= len(value) <= 300):
        return False
    if len(_LETTER.findall(label)) < 2:
        return False
    if _URL.search(label):
        return False
    return label != value


def _from_colon(top: float, x: float, raw: str) -> Field | None:
    line = _clean(raw)
    if _URL.search(line):
        return None
    match = _SEPARATORS.search(line)
    if not match:
        return None
    label, value = line[: match.start()].strip(), line[match.end():].strip()
    if not _valid(label, value):
        return None
    return Field(label, value, top, x, line, "Yüksek", "Açık ayraç")


def _cluster_words(words: list[dict]) -> list[list[dict]]:
    groups: list[list[dict]] = []
    for word in sorted(words, key=lambda w: (float(w["top"]), float(w["x0"]))):
        y = (float(word["top"]) + float(word["bottom"])) / 2
        best = next((g for g in groups
                     if abs(g[0]["_center"] - y) <= 3.0), None)
        item = dict(word, _center=y)
        if best is None:
            groups.append([item])
        else:
            best.append(item)
    return sorted(groups, key=lambda g: (min(w["_center"] for w in g),
                                          min(float(w["x0"]) for w in g)))


def _from_geometry(page, excluded_regions=()) -> list[Field]:
    """Infer a field only for a clearly separated two-part aligned row."""
    words = page.extract_words(x_tolerance=2, y_tolerance=3)
    result = []
    for group in _cluster_words(words):
        # Tables are already exported as tables. Reinterpreting their rows
        # as key/value forms produces misleading duplicate semantic fields.
        if any(any(left <= (float(w["x0"])+float(w["x1"]))/2 <= right
                       and top <= (float(w["top"])+float(w["bottom"]))/2 <= bottom
                       for left,top,right,bottom in excluded_regions)
               for w in group):
            continue
        sorted_words = sorted(group, key=lambda w: float(w["x0"]))
        if len(sorted_words) < 2:
            continue
        gaps = [
            float(b["x0"]) - float(a["x1"])
            for a, b in zip(sorted_words, sorted_words[1:])
        ]
        if not gaps:
            continue
        glyph_sizes = [
            max(1, (float(w["x1"])-float(w["x0"])) / max(1, len(str(w["text"]))))
            for w in sorted_words if str(w.get("text") or "")
        ]
        if not glyph_sizes:
            continue
        threshold = max(24.0, median(glyph_sizes) * 5.5)
        large = [(index, gap) for index, gap in enumerate(gaps)
                 if gap >= threshold]
        if len(large) != 1:
            continue
        split = large[0][0] + 1
        left, right = sorted_words[:split], sorted_words[split:]
        if len(left) > 9:
            continue
        label = _clean(" ".join(str(w["text"]) for w in left))
        value = _clean(" ".join(str(w["text"]) for w in right))
        if not _valid(label, value):
            continue
        # Only short, label-like groups can be treated as fields. A long
        # sentence split by whitespace is not a field.
        if len(label.split()) > 8 or label.endswith((".", "!", "?")):
            continue
        if not (label.endswith(":") or label.endswith("：") or
                len(label.split()) <= 5):
            continue
        label = label.rstrip(" :：")
        if not _valid(label, value):
            continue
        result.append(Field(label, value,
                            round(min(float(w["top"]) for w in group), 2),
                            round(float(left[0]["x0"]), 2),
                            label + "  " + value,
                            "Orta", "Sütun hizalaması"))
    return result


def extract_fields(page, original_lines: list[tuple[float, float, str]], excluded_regions=()) -> list[Field]:
    """Return additional form fields; do not alter or drop source lines."""
    result = []
    for top, x0, raw in original_lines:
        f = _from_colon(top, x0, raw)
        if f:
            result.append(f)

    # Geometry-based fields are secondary: when in doubt preserve original
    # text rather than manufacture extra pairs from prose/table fragments.
    for f in _from_geometry(page, excluded_regions):
        if any(abs(f.top - other.top) <= 3.0 for other in result):
            continue
        result.append(f)
    return sorted(result, key=lambda f: (f.top, f.left, f.label))
