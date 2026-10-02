# Khmer DocFixer: PDF-to-PPTX Unicode Restorer 🇰🇭

A specialized full-stack web application designed to restore legacy-encoded, garbled, or misencoded Khmer text in PowerPoint (`.pptx`) decks into clean, standardized Khmer Unicode (`U+1780 - U+17FF`), with optional reference PDF alignment and Google Gemini AI assistance.

---

## 🌟 Key Features

1. **Comprehensive PPTX Traversal Engine**:
   - Recursively inspects and rewrites shapes: **Text Frames**, **Tables**, **Grouped Shapes** (`MSO_SHAPE_TYPE.GROUP`), and **Slide Speaker Notes**.
   - Preserves all layout geometry, bold/italic styles, font sizes, colors, margins, and alignments.
   - Sets both Latin (`a:latin`), East Asian (`a:ea`), and OpenXML Complex Script (`a:cs`) typefaces for 100% native rendering in PowerPoint on Windows and macOS.

2. **Multi-Mode Restoration Engine**:
   - **Mode A (Dictionary & Linguistic Heuristics)**:
     - Detects and converts legacy ASCII hack fonts (**Limon S1/S2/R1**, **ABC-Khmer**).
     - Reorders pre-vowels (េ `\u17C1`, ែ `\u17C2`, ៃ `\u17C3`, ើ `\u17BE`, ោ `\u17C4`) to their grammatically correct Unicode position after the base consonant.
     - Heals corrupted subscripts into proper Khmer Coeng (្ `\u17D2`).
     - Extensive dictionary fixing known corruptions such as `"កំតAយូទ័រ"` &rarr; `"កុំព្យូទ័រ"`, `"ប.គ្.A"` &rarr; `"ប.គ.ព"`, administrative acronyms, and ministry terms.
   - **Mode B (PDF-Assisted Alignment)**:
     - Extracts clean Unicode text per page from an optional reference PDF using `pdfplumber` and `pypdf`.
     - Performs SequenceMatcher alignment to map corrupted slide runs to clean PDF ground-truth lines.
   - **Mode C (AI-Assisted with Google Gemini)**:
     - Deep contextual linguistic restoration using Google GenAI SDK (`gemini-2.5-flash`).

3. **Modern Interactive UI**:
   - **Dual Drag-and-Drop Zones**: Target `.pptx` file (required) + Reference `.pdf` file (optional).
   - **Side-by-Side Slide Comparison**: Real-time visual diff showing before (legacy/corrupted) vs. after (restored Unicode).
   - **Interactive Review Table**: Filter, search, and inline-edit any proposed replacement. Toggle Accept/Reject individually or in bulk.
   - **Khmer Font Selector**: Choose between `Khmer OS Battambang`, `Kantumruy Pro`, `Khmer OS Siemreap`, `Hanuman`, `Khmer OS Muol Light`, and `Koh Santepheap`.
   - **Bilingual Interface**: 1-click toggle between **ភាសាខ្មែរ (Khmer)** and **English**.
   - **1-Click Demo Sample**: Instant sample generator that builds a realistic corrupted presentation with tables, grouped shapes, and matching reference PDF.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.14 + FastAPI + `uv`
  - `python-pptx`: Shape hierarchy traversal, text frame parsing, XML DrawingML font styling.
  - `pdfplumber` & `pypdf`: Reference PDF text and line layout extraction.
  - `google-genai`: Optional Gemini 2.5 Flash multimodal restoration.
  - `reportlab`: Test data generation.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ (tested on Python 3.14 with `uv`)
- Node.js 18+ and `npm`

### Quick Start (Single Command / Full App)

Run the backend (which also automatically serves the built frontend):

```powershell
# From the project root:
cd backend
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Then open your browser at **`http://localhost:8000`**.

---

### Development Mode (Dual Server)

1. **Start Backend**:
```powershell
cd backend
uv run uvicorn backend.main:app --port 8000 --reload
```

2. **Start Frontend**:
```powershell
cd frontend
npm run dev
```
Open **`http://localhost:5173`** (Vite proxies all `/api` calls to the backend on port 8000).

---

## 🧪 Testing with 1 Click

1. Open the application.
2. Click the **"Load Demo Sample (1-Click Test)"** / **"សាកល្បងឯកសារគំរូ"** button in the header or upload zone.
3. The app will immediately generate realistic corrupted slides containing:
   - Garbled titles like `"កំតAយូទ័រ និង បេច្ចេកវិទ្យាព័ត៌មានវិទ្យា"`
   - Limon legacy strings like `salklviFüal½y sRmab; kmµviFIB eRkAgkar`
   - Corrupted abbreviations like `"ប.គ្.A"`
   - Tables, flowchart diagrams, and speaker notes
4. Review the side-by-side comparison and table, edit terms if desired, and click **"Download Corrected PPTX"**!
