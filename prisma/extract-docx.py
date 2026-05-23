import zipfile
import xml.etree.ElementTree as ET
import os

def extract_docx_text(docx_path, txt_path):
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    
    if not os.path.exists(docx_path):
        print(f"Error: Docx file not found at {docx_path}")
        return
        
    try:
        with zipfile.ZipFile(docx_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            paragraphs = []
            for paragraph in root.iter(ns + 'p'):
                texts = [node.text for node in paragraph.iter(ns + 't') if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            
            full_text = '\n'.join(paragraphs)
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
            
            print(f"Success! Extracted docx to {txt_path}")
            print(f"Total length: {len(full_text)} characters.")
    except Exception as e:
        print(f"Failed to extract docx: {str(e)}")

docx_file = "Services/for these services __Used MCP tool_ neon_run_sql....docx"
txt_file = "Services/extracted_services.txt"
extract_docx_text(docx_file, txt_file)
