"""Local, offline semantics QA. Run: python -m unittest discover -s tests -v."""
import sys
from pathlib import Path
import unittest
from openpyxl import Workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "docs"))
from python.semantic_fields import extract_fields
from python.semantic_tables import structured_cells
from python.document_layout import _text


class StubPage:
    def __init__(self, words=()):
        self.words = list(words)

    def extract_words(self, **kwargs):
        return self.words


def word(text, x0, x1):
    return {"text": text, "x0": x0, "x1": x1, "top": 10, "bottom": 22}


class SemanticTests(unittest.TestCase):
    def test_colon_field_preserves_leading_zeroes(self):
        result = extract_fields(StubPage(), [(10, 12, "Belge No: 000123")])
        self.assertEqual((result[0].label, result[0].value), ("Belge No", "000123"))
        self.assertEqual(result[0].confidence, "Yüksek")

    def test_prose_not_inferred_as_field(self):
        self.assertEqual(extract_fields(StubPage(), [(10, 12, "Bu sıradan bir açıklamadır.")]), [])

    def test_two_column_alignment(self):
        a=StubPage([word("Başvuru", 10, 54), word("No", 59, 73), word("A001", 122, 151)])
        fields=extract_fields(a,[])
        self.assertEqual([(f.label,f.value) for f in fields],[("Başvuru No","A001")])
        self.assertEqual(fields[0].confidence,"Orta")

    def test_table_region_not_reclassified(self):
        a=StubPage([word("Başvuru",10,54),word("No",59,73),word("A001",122,151)])
        self.assertEqual(extract_fields(a,[],excluded_regions=[(0,0,180,30)]),[])

    def test_no_formula_injection(self):
        wb=Workbook()
        c=wb.active.cell(1,1)
        _text(c,"=HYPERLINK(\"https://example.invalid\")")
        self.assertEqual(c.data_type,"s")

    def test_long_table_has_reversible_provenance(self):
        rows=[["Kod","Tarih","Açıklama"],["0001","01.01.2026","=1+1"],["0002","","Durum"]]
        cells=structured_cells(rows)
        observed={(c.row,c.column):c.value for c in cells}
        expected={(i+1,j+1):v for i,row in enumerate(rows) for j,v in enumerate(row) if v}
        self.assertEqual(observed,expected)
        self.assertEqual(len(cells),8)

    def test_no_hallucination_when_no_header(self):
        cells=structured_cells([["001","999"],["002","888"]])
        self.assertTrue(all(c.confidence=="Düşük" for c in cells))
        self.assertEqual(len(cells),4)


if __name__=="__main__":
    unittest.main()
