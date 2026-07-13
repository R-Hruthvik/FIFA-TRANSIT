import os

class ConfigProvider:
    def __init__(self):
        self.secure_sandbox = os.getenv("SECURE_SANDBOX", "True").lower() == "true"
        
        # Route model variables directly using LiteLLM syntax
        # e.g., 'openai/gpt-4o', 'vllm/nvidia/nvidia-nemotron-nano-9b-v2'
        self.default_model = os.getenv("MODEL_NAME", "openai/gpt-4o")
        
    def get_model(self) -> str:
        return self.default_model
