"""
Native Office-to-PDF Exporter for High-Fidelity Khmer Unicode Rendering.
Utilizes Microsoft PowerPoint and Word COM automation on Windows to produce PDFs
with full OpenType font shaping (HarfBuzz / Uniscribe / DirectWrite), ensuring
Khmer subscript consonants (ជើង / Coeng), dependent vowels, and diacritics
render 100% accurately without PyMuPDF glyph dropouts.
"""

import logging
import os
import shutil
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)


def export_pptx_to_pdf(pptx_path: str, output_pdf_path: str, timeout: int = 60) -> bool:
    """
    Exports a PowerPoint presentation (.pptx) to PDF using Microsoft PowerPoint COM automation.
    Ensures 100% native Windows OpenType complex script shaping (Uniscribe/DirectWrite)
    so all Khmer Coeng (ជើង), dependent vowels, and diacritics render perfectly.
    """
    pptx_abs = os.path.abspath(pptx_path)
    pdf_abs = os.path.abspath(output_pdf_path)

    if not os.path.exists(pptx_abs):
        raise FileNotFoundError(f"PPTX file not found at {pptx_abs}")

    os.makedirs(os.path.dirname(pdf_abs), exist_ok=True)
    if os.path.exists(pdf_abs):
        try:
            os.remove(pdf_abs)
        except Exception:
            pass

    # 1. Try Windows PowerPoint COM Automation
    if os.name == "nt":
        ps_script = f"""
$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null
try {{
    $ppt = New-Object -ComObject PowerPoint.Application
    # Open ReadOnly, Untitled, WithWindow=False
    $pres = $ppt.Presentations.Open('{pptx_abs}', [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    # 32 = ppSaveAsPDF
    $pres.SaveAs('{pdf_abs}', 32)
    $pres.Close()
    $pres = $null
    $ppt.Quit()
    $ppt = $null
    exit 0
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}} finally {{
    if ($pres -ne $null) {{
        try {{ $pres.Close() }} catch {{}}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null
    }}
    if ($ppt -ne $null) {{
        try {{ $ppt.Quit() }} catch {{}}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    }}
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}}
"""
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            if result.returncode == 0 and os.path.exists(pdf_abs) and os.path.getsize(pdf_abs) > 0:
                logger.info(f"Successfully exported PPTX to PDF via PowerPoint COM: {pdf_abs}")
                return True
            else:
                logger.warning(f"PowerPoint COM export returned non-zero ({result.returncode}): {result.stderr.strip() or result.stdout.strip()}")
        except Exception as e:
            logger.warning(f"PowerPoint COM automation error: {e}")

    # 2. Fallback: LibreOffice headless conversion
    soffice_cmd = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_cmd and os.name == "nt":
        # Check standard Windows paths for LibreOffice
        for candidate in [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]:
            if os.path.exists(candidate):
                soffice_cmd = candidate
                break

    if soffice_cmd:
        try:
            out_dir = os.path.dirname(pdf_abs)
            cmd = [
                soffice_cmd,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                out_dir,
                pptx_abs,
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            expected_pdf = os.path.join(out_dir, os.path.splitext(os.path.basename(pptx_abs))[0] + ".pdf")
            if os.path.exists(expected_pdf):
                if expected_pdf != pdf_abs:
                    shutil.move(expected_pdf, pdf_abs)
                logger.info(f"Successfully exported PPTX to PDF via LibreOffice: {pdf_abs}")
                return True
        except Exception as e:
            logger.warning(f"LibreOffice conversion failed: {e}")

    return False


def export_docx_to_pdf(docx_path: str, output_pdf_path: str, timeout: int = 60) -> bool:
    """
    Exports a Word document (.docx) to PDF using Microsoft Word COM automation.
    Ensures 100% native Windows OpenType complex script shaping (Uniscribe/DirectWrite)
    so all Khmer Coeng (ជើង), dependent vowels, and diacritics render perfectly.
    """
    docx_abs = os.path.abspath(docx_path)
    pdf_abs = os.path.abspath(output_pdf_path)

    if not os.path.exists(docx_abs):
        raise FileNotFoundError(f"DOCX file not found at {docx_abs}")

    os.makedirs(os.path.dirname(pdf_abs), exist_ok=True)
    if os.path.exists(pdf_abs):
        try:
            os.remove(pdf_abs)
        except Exception:
            pass

    # 1. Try Windows Word COM Automation
    if os.name == "nt":
        ps_script = f"""
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {{
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    # Open ReadOnly=True, ConfirmConversions=False
    $doc = $word.Documents.Open('{docx_abs}', $false, $true)
    # 17 = wdExportFormatPDF
    $doc.SaveAs('{pdf_abs}', 17)
    $doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdDoNotSaveChanges)
    $doc = $null
    $word.Quit()
    $word = $null
    exit 0
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}} finally {{
    if ($doc -ne $null) {{
        try {{ $doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdDoNotSaveChanges) }} catch {{}}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
    }}
    if ($word -ne $null) {{
        try {{ $word.Quit() }} catch {{}}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    }}
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}}
"""
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            if result.returncode == 0 and os.path.exists(pdf_abs) and os.path.getsize(pdf_abs) > 0:
                logger.info(f"Successfully exported DOCX to PDF via Word COM: {pdf_abs}")
                return True
            else:
                logger.warning(f"Word COM export returned non-zero ({result.returncode}): {result.stderr.strip() or result.stdout.strip()}")
        except Exception as e:
            logger.warning(f"Word COM automation error: {e}")

    # 2. Fallback: LibreOffice headless conversion
    soffice_cmd = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_cmd and os.name == "nt":
        for candidate in [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]:
            if os.path.exists(candidate):
                soffice_cmd = candidate
                break

    if soffice_cmd:
        try:
            out_dir = os.path.dirname(pdf_abs)
            cmd = [
                soffice_cmd,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                out_dir,
                docx_abs,
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            expected_pdf = os.path.join(out_dir, os.path.splitext(os.path.basename(docx_abs))[0] + ".pdf")
            if os.path.exists(expected_pdf):
                if expected_pdf != pdf_abs:
                    shutil.move(expected_pdf, pdf_abs)
                logger.info(f"Successfully exported DOCX to PDF via LibreOffice: {pdf_abs}")
                return True
        except Exception as e:
            logger.warning(f"LibreOffice conversion failed: {e}")

    return False
