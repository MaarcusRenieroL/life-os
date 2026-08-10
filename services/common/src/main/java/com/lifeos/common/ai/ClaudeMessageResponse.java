package com.lifeos.common.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ClaudeMessageResponse(
    List<ClaudeContentBlock> content, String model, @JsonProperty("stop_reason") String stopReason) {}
