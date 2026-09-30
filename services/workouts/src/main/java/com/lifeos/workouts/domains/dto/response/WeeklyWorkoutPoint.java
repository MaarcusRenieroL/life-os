package com.lifeos.workouts.domains.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyWorkoutPoint(LocalDate weekStart, int sessions, BigDecimal volume, int minutes) {}
