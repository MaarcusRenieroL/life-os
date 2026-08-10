package com.lifeos.common.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ClaudeMessageRequest(
    String model,
    @JsonProperty("max_tokens") int maxTokens,
    List<ClaudeMessage> messages,
    String system) {}
