import fitz  # PyMuPDF

def extract_text_from_pdf(filepath):
    """Extract text content from a PDF file."""
    text = ""
    try:
        doc = fitz.open(filepath)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text.strip()
