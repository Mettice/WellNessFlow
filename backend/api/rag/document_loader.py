from typing import List, Dict
from werkzeug.datastructures import FileStorage
from datetime import datetime
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from models.database import Document, DocumentChunk, SessionLocal
from .embeddings import generate_embeddings
import os
import re
from dotenv import load_dotenv
import traceback


# Load environment variables
load_dotenv()

def get_loader(file_path: str, file_type: str):
    """Get the appropriate document loader based on file type."""
    if file_type == 'pdf':
        return PyPDFLoader(file_path)
    elif file_type == 'docx':
        return Docx2txtLoader(file_path)
    else:  # txt and other text files
        return TextLoader(file_path)

def process_document(file_path: str, spa_id: str = None, document_id: int = None) -> str:
    """
    Process document for RAG - splits into chunks and generates embeddings.
    """
    print("\n=== Document Processing Debug ===")
    print(f"Processing file: {file_path}")
    print(f"Spa ID: {spa_id}")
    print(f"Document ID: {document_id}")
    
    try:
        # Get appropriate loader based on file type
        file_type = os.path.splitext(file_path)[1][1:].lower()
        loader = get_loader(file_path, file_type)
        
        # Load and split the document
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Split document into {len(chunks)} chunks")
        
        # Store chunks with embeddings
        db = SessionLocal()
        try:
            # Get the document record by ID
            doc = db.query(Document).filter_by(id=document_id).first() if document_id else None
            
            if not doc:
                print("Warning: Document record not found in database")
                return "Error: Document record not found"

            # Process and store each chunk
            for i, chunk in enumerate(chunks):
                # Generate embedding for chunk
                embedding = generate_embeddings(chunk.page_content)
                
                # Store chunk with embedding
                chunk_doc = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=i,
                    content=chunk.page_content,
                    embedding=embedding,
                    chunk_metadata=chunk.metadata,
                    created_at=datetime.utcnow()
                )
                db.add(chunk_doc)
            
            db.commit()
            print(f"Stored {len(chunks)} chunks with embeddings")
            return "Document processed successfully"
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")
        raise

def clean_chunk_text(text: str) -> str:
    """Clean and preprocess chunk text."""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Remove special characters but keep punctuation
    text = re.sub(r'[^\w\s.,!?-]', '', text)
    return text

def identify_chunk_type(text: str) -> str:
    """Identify the type of content in the chunk."""
    text_lower = text.lower()
    if 'q:' in text_lower or 'question:' in text_lower:
        return 'qa'
    elif len(text.split()) > 50:  # Longer chunks likely content
        return 'content'
    else:
        return 'snippet'

def extract_keywords(text: str) -> List[str]:
    """Extract key terms from the text."""
    # Simple keyword extraction based on capitalized terms and terms after markers
    keywords = []
    
    # Find capitalized terms (potential proper nouns)
    cap_terms = re.findall(r'\b[A-Z][a-z]+\b', text)
    keywords.extend(cap_terms)
    
    # Find terms after common markers
    markers = ['called', 'named', 'known as', 'refers to']
    for marker in markers:
        pattern = f"{marker}\s+([A-Za-z]+)"
        terms = re.findall(pattern, text)
        keywords.extend(terms)
    
    return list(set(keywords)) 