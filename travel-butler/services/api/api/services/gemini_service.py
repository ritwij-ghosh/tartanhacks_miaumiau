"""
Gemini LLM Service
Handles all interactions with Google's Gemini API for the Travel Butler chat.
"""
import os
from typing import Any, AsyncIterator
import google.generativeai as genai
from pydantic import BaseModel


class Message(BaseModel):
    """Chat message structure"""
    role: str  # "user" or "assistant"
    content: str


class GeminiConfig(BaseModel):
    """Gemini service configuration"""
    api_key: str
    model: str = "gemini-2.0-flash"
    temperature: float = 0.7
    max_tokens: int = 2048


class GeminiService:
    """Service for interacting with Gemini LLM"""
    
    def __init__(self, config: GeminiConfig):
        self.config = config
        genai.configure(api_key=config.api_key)
        self.model = genai.GenerativeModel(config.model)
        
    async def generate_response(
        self, 
        messages: list[Message],
        system_prompt: str | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        Generate a response from Gemini given conversation history.
        
        Args:
            messages: List of conversation messages
            system_prompt: Optional system instruction for the model
            tools: Optional list of tool definitions (for MCP integration)
            
        Returns:
            Generated response text
        """
        # Convert messages to Gemini format
        gemini_messages = self._convert_messages(messages)
        
        # Build generation config
        generation_config = genai.types.GenerationConfig(
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_tokens,
        )
        
        # Create chat session
        chat_config = {}
        if system_prompt:
            chat_config["system_instruction"] = system_prompt
            
        chat = self.model.start_chat(history=gemini_messages[:-1])
        
        # Generate response
        response = await chat.send_message_async(
            gemini_messages[-1]["parts"],
            generation_config=generation_config,
        )
        
        return response.text
    
    async def generate_with_tools(
        self,
        messages: list[Message],
        tools: list[dict[str, Any]],
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        """
        Generate response with tool calling capability.
        
        Args:
            messages: Conversation history
            tools: List of tool definitions in Gemini format
            system_prompt: Optional system instruction
            
        Returns:
            Dict with 'text' and optional 'tool_calls' keys
        """
        # Convert messages to Gemini format
        gemini_messages = self._convert_messages(messages)
        
        # Build generation config
        generation_config = genai.types.GenerationConfig(
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_tokens,
        )
        
        # Convert tools to Gemini function declarations
        gemini_tools = self._convert_tools(tools) if tools else None
        
        # Create model with tools
        chat_config = {}
        if system_prompt:
            chat_config["system_instruction"] = system_prompt
        if gemini_tools:
            chat_config["tools"] = gemini_tools
            
        model = genai.GenerativeModel(
            self.config.model,
            **chat_config
        )
        
        chat = model.start_chat(history=gemini_messages[:-1])
        
        # Generate response
        response = await chat.send_message_async(
            gemini_messages[-1]["parts"],
            generation_config=generation_config,
        )
        
        # Parse response — check for function calls first
        result: dict[str, Any] = {}
        tool_calls = []

        for part in response.candidates[0].content.parts:
            if part.function_call.name:
                tool_calls.append({
                    "name": part.function_call.name,
                    "arguments": dict(part.function_call.args),
                })
            elif part.text:
                result["text"] = part.text

        if tool_calls:
            result["tool_calls"] = tool_calls

        return result
    
    async def stream_response(
        self,
        messages: list[Message],
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        """
        Stream response from Gemini token by token.
        
        Args:
            messages: Conversation history
            system_prompt: Optional system instruction
            
        Yields:
            Response text chunks
        """
        gemini_messages = self._convert_messages(messages)
        
        generation_config = genai.types.GenerationConfig(
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_tokens,
        )
        
        chat_config = {}
        if system_prompt:
            chat_config["system_instruction"] = system_prompt
            
        model = genai.GenerativeModel(self.config.model, **chat_config)
        chat = model.start_chat(history=gemini_messages[:-1])
        
        response = await chat.send_message_async(
            gemini_messages[-1]["parts"],
            generation_config=generation_config,
            stream=True,
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    
    def _convert_messages(self, messages: list[Message]) -> list[dict[str, Any]]:
        """Convert our message format to Gemini's format"""
        gemini_messages = []
        for msg in messages:
            role = "model" if msg.role == "assistant" else "user"
            gemini_messages.append({
                "role": role,
                "parts": [msg.content],
            })
        return gemini_messages
    
    _TYPE_MAP = {
        "object": genai.protos.Type.OBJECT,
        "string": genai.protos.Type.STRING,
        "number": genai.protos.Type.NUMBER,
        "integer": genai.protos.Type.INTEGER,
        "boolean": genai.protos.Type.BOOLEAN,
        "array": genai.protos.Type.ARRAY,
    }

    def _convert_schema(self, schema: dict[str, Any]) -> genai.protos.Schema:
        """Convert a JSON Schema dict to a Gemini Schema protobuf."""
        kwargs: dict[str, Any] = {}
        if "type" in schema:
            kwargs["type"] = self._TYPE_MAP[schema["type"]]
        if "description" in schema:
            kwargs["description"] = schema["description"]
        if "required" in schema:
            kwargs["required"] = schema["required"]
        if "properties" in schema:
            kwargs["properties"] = {
                k: self._convert_schema(v)
                for k, v in schema["properties"].items()
            }
        if "items" in schema:
            kwargs["items"] = self._convert_schema(schema["items"])
        return genai.protos.Schema(**kwargs)

    def _convert_tools(self, tools: list[dict[str, Any]]) -> list[Any]:
        """
        Convert tool definitions to Gemini function declarations.

        Expected tool format:
        {
            "name": "tool_name",
            "description": "What the tool does",
            "parameters": {
                "type": "object",
                "properties": {...},
                "required": [...]
            }
        }
        """
        function_declarations = []

        for tool in tools:
            params = tool.get("parameters", {})
            func_decl = genai.protos.FunctionDeclaration(
                name=tool["name"],
                description=tool.get("description", ""),
                parameters=self._convert_schema(params) if params else None,
            )
            function_declarations.append(func_decl)

        return [genai.protos.Tool(function_declarations=function_declarations)]


# Factory function for easy instantiation
def create_gemini_service(
    api_key: str | None = None,
    model: str = "gemini-2.0-flash",
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> GeminiService:
    """
    Create a GeminiService instance.
    
    Args:
        api_key: Gemini API key (defaults to GEMINI_API_KEY env var)
        model: Model name to use
        temperature: Generation temperature
        max_tokens: Maximum tokens to generate
        
    Returns:
        Configured GeminiService instance
    """
    if api_key is None:
        from api.config import settings
        api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in environment. "
                "Pass api_key parameter or set GEMINI_API_KEY env var."
            )
    
    config = GeminiConfig(
        api_key=api_key,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    
    return GeminiService(config)
