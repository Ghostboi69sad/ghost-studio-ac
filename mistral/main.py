from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from pydantic import BaseModel
from typing import Optional
from ollama_client import OllamaClient
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, PhiConfig, PhiForCausalLM
from huggingface_hub import snapshot_download
import logging
import os
import gc

# Register Phi model architecture before importing AutoConfig
from transformers.models.auto.configuration_auto import CONFIG_MAPPING
from transformers.models.auto.modeling_auto import MODEL_MAPPING, AutoConfig

CONFIG_MAPPING.register("phi", PhiConfig)
MODEL_MAPPING.register(PhiConfig, PhiForCausalLM)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Chat API")
app.state.limiter = limiter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model and tokenizer
model = None
tokenizer = None

class ChatRequest(BaseModel):
    prompt: str
    temperature: Optional[float] = 0.7

ollama_client = OllamaClient()

async def download_model(model_id: str, local_dir: str):
    """Download model from Hugging Face Hub"""
    logger.info(f"Downloading model {model_id} to {local_dir}")
    try:
        os.makedirs(local_dir, exist_ok=True)
        snapshot_download(
            repo_id=model_id,
            local_dir=local_dir,
            local_dir_use_symlinks=False
        )
        logger.info("Model download completed")
    except Exception as e:
        logger.error(f"Model download failed: {str(e)}")
        raise

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up...")
    try:
        logger.info("Loading model...")
        global model, tokenizer
        
        model_name = "microsoft/phi-2"
        model_path = os.getenv("MODEL_PATH", "/app/models/phi-3.8")
        
        # Download model if not exists
        if not os.path.exists(model_path):
            await download_model(model_name, model_path)
            
        logger.info(f"Loading model: {model_name}")
        
        config = AutoConfig.from_pretrained(model_path, trust_remote_code=True)
        
        tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            cache_dir=os.getenv("TRANSFORMERS_CACHE_DIR", "/app/models"),
            trust_remote_code=True
        )
        logger.info("Tokenizer loaded successfully")
        
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            config=config,
            torch_dtype=torch.float16,
            device_map="auto",
            max_memory={
                "cuda": "2GB",
                "cpu": "2GB"
            },
            offload_folder="/app/models/offload",
            low_cpu_mem_usage=True,
            load_in_4bit=True,
            trust_remote_code=True
        )
        
        # Set up memory optimization
        torch.cuda.empty_cache()
        gc.collect()
        
        logger.info("Model loaded successfully")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add memory cleanup after each request
@app.middleware("http")
async def add_process_time_header(request, call_next):
    response = await call_next(request)
    torch.cuda.empty_cache()
    gc.collect()
    return response

@app.post("/chat")
@limiter.limit("60/minute")  # Adjust rate limit as needed
async def chat(request: ChatRequest):
    try:
        response = await ollama_client.generate(request.prompt)
        return {"response": response.get("response", ""), "status": "success"}
    except Exception as e:
        logger.error(f"Error during chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)