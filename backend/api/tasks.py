"""Background task processing module."""

import threading
from queue import Queue, Empty
from typing import Any, Callable
import logging
from datetime import datetime
from .rag.document_loader import process_document
from models.database import SessionLocal, Document
import traceback
import tempfile
import os
import base64

logger = logging.getLogger(__name__)

# Task queue
task_queue = Queue()
_should_stop = False

def process_task(task_id: int) -> None:
    """Process a document in the background."""
    db = SessionLocal()
    try:
        # Get document from database
        doc = db.query(Document).filter_by(id=task_id).first()
        if not doc:
            logger.error(f"Document {task_id} not found")
            return

        logger.info(f"Processing document {task_id}: {doc.name}")
        
        # Skip if already processed
        if doc.processed:
            logger.info(f"Document {task_id} already processed")
            return
            
        # Create a temporary file with the document content
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{doc.doc_type}") as temp_file:
            try:
                # Write content to temp file
                logger.info(f"Creating temporary file for document {task_id}")
                if doc.doc_metadata.get('content_type', '').startswith('text/'):
                    temp_file.write(doc.content.encode('utf-8'))
                else:
                    temp_file.write(base64.b64decode(doc.content))
                temp_file.flush()
                
                # Process the document
                logger.info(f"Starting document processing for {task_id}")
                process_document(temp_file.name, spa_id=doc.spa_id)
                
                # Update document status
                doc.processed = True
                doc.processed_at = datetime.utcnow()
                doc.error_message = None
                db.commit()
                logger.info(f"Successfully processed document {task_id}")
                
            except Exception as e:
                error_msg = f"Error processing document {task_id}: {str(e)}"
                logger.error(error_msg)
                logger.error(f"Stack trace: {traceback.format_exc()}")
                doc.processed = False
                doc.error_message = error_msg
                db.commit()
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_file.name)
                    logger.info(f"Cleaned up temporary file for document {task_id}")
                except Exception as e:
                    logger.error(f"Error cleaning up temp file: {str(e)}")
            
    except Exception as e:
        error_msg = f"Task error for document {task_id}: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Stack trace: {traceback.format_exc()}")
        try:
            if doc:
                doc.error_message = error_msg
                doc.processed = False
                db.commit()
        except:
            pass
    finally:
        db.close()

def worker() -> None:
    """Background worker that processes tasks from the queue."""
    logger.info("Background worker started")
    while not _should_stop:
        try:
            task_id = task_queue.get(timeout=1)  # 1 second timeout
            if task_id is not None:
                logger.info(f"Processing task {task_id}")
                process_task(task_id)
                logger.info(f"Completed task {task_id}")
            task_queue.task_done()
        except Empty:
            # This is normal when queue is empty, just continue
            continue
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
            logger.error(f"Stack trace: {traceback.format_exc()}")
            continue

def start_background_tasks() -> None:
    """Start the background task processor."""
    logger.info("Starting background task processor")
    thread = threading.Thread(target=worker, daemon=True, name="DocumentProcessor")
    thread.start()
    logger.info(f"Background task processor started in thread {thread.name}")

def stop_background_tasks() -> None:
    """Stop the background task processor."""
    global _should_stop
    logger.info("Stopping background task processor")
    _should_stop = True
    logger.info("Background task processor stopping") 