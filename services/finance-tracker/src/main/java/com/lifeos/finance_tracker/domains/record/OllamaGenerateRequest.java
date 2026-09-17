package com.lifeos.finance_tracker.domains.record;

// Field must be named "model" - Ollama's /api/generate endpoint reads that
// exact JSON key, not "ollamaModel".
public record OllamaGenerateRequest(String model, String prompt, boolean stream, String format) {}
