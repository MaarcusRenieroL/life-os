package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.Size;

public record CompleteSessionRequest(@Size(max = 5000) String notes) {}
