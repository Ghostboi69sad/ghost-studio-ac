import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import os
from contextlib import asynccontextmanager
from functools import lru_cache

app = FastAPI(title="Mistral API", description="API for Mistral 7B Instruct model")

# Model configuration
@lru_cache()
def get_model():
    """Load and cache the model with optimized memory usage."""
    try:
        # Set environment variables for memory optimization
        os.environ['CUDA_VISIBLE_DEVICES'] = '0'  # Use only one GPU
        os.environ['CUDA_LAUNCH_BLOCKING'] = '1'  # For better memory management
        os.environ['CUDA_CACHE_MAXSIZE'] = '0'    # Disable CUDA cache
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            "mistralai/Mistral-7B-Instruct-v0.1",
            model_max_length=2048  # Limit maximum sequence length
        )
        
        # Load model with optimized settings
        model = AutoModelForCausalLM.from_pretrained(
            "mistralai/Mistral-7B-Instruct-v0.1",
            torch_dtype=torch.float16,
            device_map={
                '': 0,  # Use GPU
                'transformer.h.0': 'cpu',  # Offload first layer to CPU
                'transformer.h.1': 'cpu',  # Offload second layer to CPU
            },
            max_memory={
                0: "7GB",  # Limit GPU memory usage
                'cpu': '4GB'  # Limit CPU memory usage
            },
            load_in_4bit=True,
            quantization_config={
                "load_in_4bit": True,
                "bnb_4bit_compute_dtype": torch.float16,
                "bnb_4bit_use_double_quant": True,
                "bnb_4bit_quant_type": "nf4"
            }
        )
        
        # Add memory monitoring
        def memory_monitor():
            import psutil
            process = psutil.Process()
            mem_info = process.memory_info()
            if mem_info.rss / (1024 * 1024 * 1024) > 7:  # 7GB limit
                raise MemoryError("Memory usage exceeded 7GB limit")
        
        # Run memory monitor periodically
        import threading
        def monitor_memory():
            while True:
                try:
                    memory_monitor()
                except MemoryError as e:
                    raise HTTPException(status_code=503, detail=str(e))
                threading.sleep(1)
        
        threading.Thread(target=monitor_memory, daemon=True).start()
        
        return model, tokenizer
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]  # List of message objects with role and content
    temperature: float = 0.7
    max_tokens: int = 2000
    top_p: float = 0.95
    top_k: int = 50

class ChatResponse(BaseModel):
    content: str
    usage: Dict[str, int]

@app.get("/")
async def root():
    return {"message": "Mistral API is running"}

@app.post("/v1/chat/completions", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Get cached model and tokenizer
        model, tokenizer = get_model()
        
        # Prepare the prompt from messages
        messages = request.messages
        prompt = ""
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                prompt += f"User: {content}\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n"
            else:
                prompt += f"{content}\n"

        # Tokenize input
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                top_k=request.top_k,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )

        # Decode and format response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Calculate usage
        input_tokens = len(inputs["input_ids"][0])
        output_tokens = len(outputs[0])
        total_tokens = input_tokens + output_tokens
        
        return ChatResponse(
            content=response,
            usage={
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
