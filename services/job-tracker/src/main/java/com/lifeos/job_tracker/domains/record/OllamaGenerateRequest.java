package com.lifeos.job_tracker.domains.record;

public record OllamaGenerateRequest(String model, String prompt, boolean stream, String format) {}
