from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv
import threading

# Load environment variables
load_dotenv()

def generate_embeddings(text: str, api_key: str = None) -> list[float]:
    """
    Generate embeddings for the given text using OpenAI's API.
    """
    print("\n=== Embeddings Generation Debug ===")
    print(f"Process ID: {os.getpid()}")
    print(f"Thread ID: {threading.get_ident()}")
    
    # Validate and set up API key
    if not api_key:
        api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OpenAI API key not found")
    if not (api_key.startswith('sk-') or api_key.startswith('sk-proj-')):
        raise ValueError("Invalid OpenAI API key format - must start with 'sk-' or 'sk-proj-'")
    
    print(f"API key validation:")
    print(f"- Length: {len(api_key)}")
    print(f"- Format: {'Valid' if api_key.startswith('sk-') or api_key.startswith('sk-proj-') else 'Invalid'}")
    
    try:
        # Ensure text is a string
        if not isinstance(text, str):
            text = str(text)
        
        # Remove any null bytes or invalid characters
        text = text.replace('\x00', '').strip()
        
        if not text:
            raise ValueError("Empty text provided for embeddings generation")
            
        print(f"\nProcessing text for embeddings:")
        print(f"- Text length: {len(text)}")
        print(f"- First 100 chars: {text[:100]}...")
        
        print("\nCreating OpenAI embeddings object...")
        embeddings = OpenAIEmbeddings(
            openai_api_key=api_key,
            model="text-embedding-3-small"
        )
        print("OpenAI embeddings object created successfully")
        
        print("Generating embeddings...")
        result = embeddings.embed_query(text)
        print(f"Embeddings generated successfully (vector size: {len(result)})")
        return result
    except Exception as e:
        print(f"\nError generating embeddings: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print(f"Error args: {e.args}")
        raise 