package com.lifeos.core.domains.record;

/** status: "created" (routed and saved - module/summary populated) or "needs_ai_approval"
 * (Ollama couldn't process it; module/summary are null, the frontend should show a "use Claude
 * instead? this costs money" confirmation and resubmit with useClaudeFallback=true if approved). */
public record QuickCaptureResult(String status, String module, String summary) {}
