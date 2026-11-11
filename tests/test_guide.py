import copy
from collections import Counter
import importlib.util
import json
from pathlib import Path
import shutil
import uuid
import unittest
from pypdf import PdfReader
import fitz

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("guide_renderer",ROOT/"tools/render_guide.py")
guide=importlib.util.module_from_spec(spec)
spec.loader.exec_module(guide)


class GuideTests(unittest.TestCase):
    def setUp(self):
        (ROOT/".tmp").mkdir(exist_ok=True)
        self.folder=ROOT/".tmp"/("guide-test-"+uuid.uuid4().hex)
        self.folder.mkdir()
        shutil.copytree(ROOT/"templates/design",self.folder,dirs_exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.folder)

    def update(self,file,mutator):
        dest=self.folder/file
        value=json.loads(dest.read_text(encoding="utf-8"))
        mutator(value)
        dest.write_text(json.dumps(value),encoding="utf-8")

    def test_pdf_and_svg_render_with_all_instructions_and_safe_text(self):
        self.update("guide.json",lambda d:d["steps"][0].update(
            instruction="Insert F1 <carefully> & inspect the connection. "*12))
        output=guide.render(self.folder)
        reader=PdfReader(output)
        self.assertGreaterEqual(len(reader.pages),2)
        text="\n".join(p.extract_text() for p in reader.pages)
        self.assertIn("template-not-a-buildable-design",text)
        self.assertIn("Insert F1 <carefully> & inspect",text)
        self.assertIn("Check",text)
        svg=(self.folder/"diagrams/step-01.svg").read_text()
        self.assertIn("<polygon",svg)
        with fitz.open(output) as doc:
            for page in doc:
                for block in page.get_text("blocks"):
                    self.assertGreaterEqual(block[0],0)
                    self.assertLessEqual(block[2],page.rect.width)
                    self.assertGreaterEqual(block[1],0)
                    self.assertLessEqual(block[3],page.rect.height)

    def test_parts_omission_reuse_and_unknown_codes_are_rejected(self):
        for changed in [
            [{"code":"F1","quantity":2}],
            [{"code":"unknown","quantity":1}],
            []
        ]:
            self.update("guide.json",lambda d:d["steps"][0].update(parts=changed))
            with self.assertRaises(ValueError):
                guide.prepare(self.folder,"Helvetica")

    def test_diagram_bounds_arrow_and_label_fit_are_validated(self):
        for shape in [
            {"type":"rect","x":470,"y":1,"width":20,"height":20},
            {"type":"circle","cx":0,"cy":0,"r":20},
            {"type":"text","x":475,"y":20,"text":"Too long","size":12},
            {"type":"line","x1":0,"y1":0,"x2":0,"y2":0,"arrow":True},
            {"type":"line","x1":10,"y1":10,"x2":float("nan"),"y2":20},
            {"type":"banana"}
        ]:
            with self.assertRaises((ValueError,KeyError)):
                guide.validate_diagram({"width":480,"height":200,"primitives":[shape]})

    def test_diagram_paths_cannot_escape_design(self):
        self.update("guide.json",lambda d:d["steps"][0].update(diagram="../outside.json"))
        with self.assertRaisesRegex(ValueError,"inside the design"):
            guide.prepare(self.folder,"Helvetica")

    def test_unicode_requires_a_covering_font_and_renders_turkish(self):
        self.update("guide.json",lambda d:d.update(title="Türkçe yapım: şasi, dişli ve güç"))
        with self.assertRaisesRegex(ValueError,"Non-ASCII"):
            guide.prepare(self.folder,"Helvetica")
        normal=Path("C:/Windows/Fonts/arial.ttf")
        bold=Path("C:/Windows/Fonts/arialbd.ttf")
        if not normal.exists():
            normal=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
            bold=normal.with_name("DejaVuSans-Bold.ttf")
        if not normal.exists() or not bold.exists():
            self.fail("Unicode rendering test needs Arial or DejaVu Sans fonts")
        output=guide.render(self.folder,normal,bold)
        self.assertIn("Türkçe yapım",PdfReader(output).pages[0].extract_text())


if __name__=="__main__":
    unittest.main()
