package com.lifeos.job_tracker.kafka;

public final class JobEventTopics {

  public static final String JOB_DISCOVERED = "job.discovered";
  public static final String APPLICATION_SUBMITTED = "application.submitted";
  public static final String INTERVIEW_SCHEDULED = "interview.scheduled";
  public static final String EMAIL_PARSED = "email.parsed";
  public static final String REFERRAL_INITIATED = "referral.initiated";
  public static final String JOB_SCORING = "job.scoring";
  public static final String FOLLOW_UP_DUE = "follow-up.due";

  private JobEventTopics() {}
}
