package com.lifeos.job_tracker.domains.record;

import java.time.LocalDate;
import java.util.List;

public record JobAnalyticsResponse(
    int totalApplications,
    List<DailyCount> applicationsByDay,
    List<WeeklyCount> applicationsByWeek,
    double responseRatePct,
    double rejectionRatePct,
    double interviewConversionRatePct,
    double offerRatePct,
    double referralResponseRatePct,
    List<SourcePerformance> bestPerformingSources,
    List<SkillFrequency> mostCommonMissingSkills,
    List<StageDwellTime> averageTimeInStage) {

  public record DailyCount(LocalDate date, int count) {}

  public record WeeklyCount(LocalDate weekStart, int count) {}

  public record SourcePerformance(String source, int applications, double responseRatePct) {}

  public record SkillFrequency(String skill, int count) {}

  public record StageDwellTime(String stage, double avgDays, int sampleSize) {}
}
