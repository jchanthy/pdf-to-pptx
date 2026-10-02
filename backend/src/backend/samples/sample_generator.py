"""
Sample Test File Generator for Khmer DocFixer.
Generates:
1. sample_corrupted.pptx: Realistic PowerPoint presentation with corrupted/legacy Khmer text,
   tables, grouped shapes, and notes.
2. sample_reference.pdf: Matching clean PDF document containing proper Khmer Unicode text.
"""

import os
from typing import Tuple
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def generate_sample_files(output_dir: str) -> Tuple[str, str]:
    """Generates sample corrupted PPTX and clean reference PDF in output_dir."""
    os.makedirs(output_dir, exist_ok=True)
    pptx_path = os.path.join(output_dir, "sample_corrupted.pptx")
    pdf_path = os.path.join(output_dir, "sample_reference.pdf")

    # 1. Create PPTX
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625) # 16:9

    blank_layout = prs.slide_layouts[6] # Blank slide

    # Slide 1: Title & Subtitle with corrupted Khmer
    slide1 = prs.slides.add_slide(blank_layout)
    
    # Title box
    tx_box = slide1.shapes.add_textbox(Inches(1), Inches(1.2), Inches(8), Inches(1.5))
    tf = tx_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "កំតAយូទ័រ និង បេច្ចេកវិទ្យាព័ត៌មានវិទ្យា"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = RGBColor(30, 41, 59)
    p.alignment = PP_ALIGN.CENTER
    
    # Subtitle box
    tx_box2 = slide1.shapes.add_textbox(Inches(1), Inches(2.8), Inches(8), Inches(1.5))
    tf2 = tx_box2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = "គម្រោងការ ប.គ្.A នៃព្រះរាជាណាចក្រកម្ពុជា"
    p2.font.size = Pt(22)
    p2.font.color.rgb = RGBColor(71, 85, 105)
    p2.alignment = PP_ALIGN.CENTER

    p2_sub = tf2.add_paragraph()
    p2_sub.text = "salklviFüal½y sRmab; kmµviFIB eRkAgkar" # Limon legacy font string
    p2_sub.font.name = "Limon R1"
    p2_sub.font.size = Pt(18)
    p2_sub.font.color.rgb = RGBColor(100, 116, 139)
    p2_sub.alignment = PP_ALIGN.CENTER

    # Slide 2: Table with corrupted entries
    slide2 = prs.slides.add_slide(blank_layout)
    # Title
    t_box = slide2.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(8.4), Inches(0.8))
    p = t_box.text_frame.paragraphs[0]
    p.text = "តារាងបុគ្គលិក និង នាយកដ្ធាន"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = RGBColor(15, 23, 42)

    # Table: 3 rows, 4 cols
    table_shape = slide2.shapes.add_table(3, 4, Inches(0.8), Inches(1.5), Inches(8.4), Inches(2.5))
    table = table_shape.table
    
    headers = ["ល.រ", "ឈ្មោះ", "មុខតំណែង", "ស្ថាប័ន"]
    for c_idx, h_text in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.text = h_text
        p = cell.text_frame.paragraphs[0]
        p.font.bold = True
        p.font.size = Pt(14)

    rows_data = [
        ["១", "សុខ សុវណ្ណ", "ប្រធាននាយកដ្ធាន", "ក្រសួងសេដ្ធកិច្ច និងហិរញ្ញវត្ថុ"],
        ["២", "ចាន់ សុភី", "សាស្ត្រាចារ្យកំតAយូទរ័", "សាកលវិទ្យាលយ័"]
    ]
    for r_idx, row_values in enumerate(rows_data):
        for c_idx, val in enumerate(row_values):
            cell = table.cell(r_idx + 1, c_idx)
            cell.text = val
            p = cell.text_frame.paragraphs[0]
            p.font.size = Pt(13)

    # Slide 3: Flowchart / Diagram boxes
    slide3 = prs.slides.add_slide(blank_layout)
    t_box3 = slide3.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(8.4), Inches(0.8))
    p = t_box3.text_frame.paragraphs[0]
    p.text = "ដំណាក់កាលអនុវត្តគម្រោងការ"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = RGBColor(15, 23, 42)

    steps = [
        ("ជំហានទី ១", "បញ្ចូលទិន្នន័យកំតAយូទ័រ"),
        ("ជំហានទី ២", "ការវិភាគ និង ដំណោះស្រាយ"),
        ("ជំហានទី ៣", "លទ្ធផល និង អភិវឌ្ឈន៍")
    ]
    box_width = Inches(2.5)
    gap = Inches(0.4)
    start_x = Inches(0.85)
    
    for i, (step_title, step_desc) in enumerate(steps):
        x = start_x + i * (box_width + gap)
        box = slide3.shapes.add_textbox(x, Inches(1.8), box_width, Inches(2.2))
        tf = box.text_frame
        p_title = tf.paragraphs[0]
        p_title.text = step_title
        p_title.font.bold = True
        p_title.font.size = Pt(18)
        p_title.font.color.rgb = RGBColor(79, 70, 229)
        
        p_desc = tf.add_paragraph()
        p_desc.text = step_desc
        p_desc.font.size = Pt(14)
        p_desc.font.color.rgb = RGBColor(51, 65, 85)

    # Slide 4: Bullet list & Speaker notes
    slide4 = prs.slides.add_slide(blank_layout)
    t_box4 = slide4.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(8.4), Inches(0.8))
    p = t_box4.text_frame.paragraphs[0]
    p.text = "សេចក្តីសន្និដ្ឋាន និង ទស្សនវិស័យ"
    p.font.size = Pt(26)
    p.font.bold = True

    bullets_box = slide4.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(8.4), Inches(3.0))
    tf4 = bullets_box.text_frame
    bullets = [
        "• ការប្រើប្រាស់កំតAយូទរ័ ក្នុងវិស័យអប់រំ និង រដ្ឋបាល",
        "• កិច្ចសហការជាមួយស្ថាប័ន ប.គ្.A ដើម្បីពង្រឹងសេវាកម្ម",
        "• ផែនការយុទ្ធសាស្រ្ត សំដៅការអភិវឌ្ឍន៍ប្រកបដោយចីរភាព"
    ]
    for b_idx, b_text in enumerate(bullets):
        p_b = tf4.paragraphs[0] if b_idx == 0 else tf4.add_paragraph()
        p_b.text = b_text
        p_b.font.size = Pt(16)
        p_b.font.color.rgb = RGBColor(30, 41, 59)

    # Add Speaker Note
    notes_slide = slide4.notes_slide
    notes_tf = notes_slide.notes_text_frame
    notes_tf.text = "កំណត់ចំណាំ៖ ត្រូវពិនិត្យរបាយការណ៍ ប.គ្.A និង ប្រព័ន្ធកំតAយូទ័រ មុនពេលបញ្ចប់កិច្ចប្រជុំ។"

    prs.save(pptx_path)

    # 2. Create Reference PDF with clean Unicode text
    c = canvas.Canvas(pdf_path, pagesize=letter)
    
    # Page 1: Clean Title
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 720, "Slide 1 Reference Document")
    c.setFont("Helvetica", 14)
    # Using UTF-8 text in PDF
    c.drawString(72, 670, "កុំព្យូទ័រ និង បច្ចេកវិទ្យាព័ត៌មានវិទ្យា")
    c.drawString(72, 640, "គម្រោងការ ប.គ.ព នៃព្រះរាជាណាចក្រកម្ពុជា")
    c.drawString(72, 610, "សាកលវិទ្យាល័យ សម្រាប់ កម្មវិធី គម្រោងការ")
    c.showPage()

    # Page 2: Clean Table
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 720, "Slide 2 Reference Document")
    c.setFont("Helvetica", 12)
    c.drawString(72, 680, "តារាងបុគ្គលិក និង នាយកដ្ឋាន")
    c.drawString(72, 650, "ល.រ | ឈ្មោះ | មុខតំណែង | ស្ថាប័ន")
    c.drawString(72, 620, "១ | សុខ សុវណ្ណ | ប្រធាននាយកដ្ឋាន | ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ")
    c.drawString(72, 590, "២ | ចាន់ សុភី | សាស្ត្រាចារ្យកុំព្យូទ័រ | សាកលវិទ្យាល័យ")
    c.showPage()

    # Page 3: Clean Workflow
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 720, "Slide 3 Reference Document")
    c.setFont("Helvetica", 12)
    c.drawString(72, 680, "ដំណាក់កាលអនុវត្តគម្រោងការ")
    c.drawString(72, 650, "ជំហានទី ១: បញ្ចូលទិន្នន័យកុំព្យូទ័រ")
    c.drawString(72, 620, "ជំហានទី ២: ការវិភាគ និង ដំណោះស្រាយ")
    c.drawString(72, 590, "ជំហានទី ៣: លទ្ធផល និង អភិវឌ្ឍន៍")
    c.showPage()

    # Page 4: Clean Conclusion
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 720, "Slide 4 Reference Document")
    c.setFont("Helvetica", 12)
    c.drawString(72, 680, "សេចក្តីសន្និដ្ឋាន និង ទស្សនវិស័យ")
    c.drawString(72, 650, "ការប្រើប្រាស់កុំព្យូទ័រ ក្នុងវិស័យអប់រំ និង រដ្ឋបាល")
    c.drawString(72, 620, "កិច្ចសហការជាមួយស្ថាប័ន ប.គ.ព ដើម្បីពង្រឹងសេវាកម្ម")
    c.drawString(72, 590, "ផែនការយុទ្ធសាស្ត្រ សំដៅការអភិវឌ្ឍន៍ប្រកបដោយចីរភាព")
    c.drawString(72, 550, "កំណត់ចំណាំ៖ ត្រូវពិនិត្យរបាយការណ៍ ប.គ.ព និង ប្រព័ន្ធកុំព្យូទ័រ មុនពេលបញ្ចប់កិច្ចប្រជុំ។")
    c.showPage()

    c.save()

    return pptx_path, pdf_path
