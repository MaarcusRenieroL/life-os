package com.lifeos.finance_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonInclude;

// Field must be named "model" - Ollama's /api/generate endpoint reads that
// exact JSON key, not "ollamaModel". `think` is sent as false so thinking models answer straight away;
// a null `format` is left out (used when the server cannot do JSON mode for the model).
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OllamaGenerateRequest(String model, String prompt, boolean stream, String format, boolean think) {}
