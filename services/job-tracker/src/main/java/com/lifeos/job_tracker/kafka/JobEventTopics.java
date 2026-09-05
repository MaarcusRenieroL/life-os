package com.lifeos.job_tracker.kafka;

public final class JobEventTopics {

  public static final String JOB_DISCOVERED = "job.discovered";
  public static final String APPLICATION_SUBMITTED = "application.submitted";
  public static final String INTERVIEW_SCHEDULED = "interview.scheduled";
  public static final String EMAIL_PARSED = "email.parsed";
  public static final String REFERRAL_INITIATED = "referral.initiated";
  public static final String JOB_SCORING = "job.scoring";
  public static final String FOLLOW_UP_DUE = "follow-up.due";

  // Resume & cover letter builder - informational events, no consumer yet.
  public static final String RESUME_VARIANT_CREATED = "resume.variant-created";
  public static final String RESUME_SECTION_UPDATED = "resume.section-updated";
  public static final String RESUME_TAILORED = "resume.tailored";
  public static final String COVER_LETTER_GENERATED = "cover-letter.generated";
  public static final String COVER_LETTER_CUSTOMIZED = "cover-letter.customized";
  public static final String ACCOMPLISHMENT_ADDED = "accomplishment.added";
  public static final String RESUME_KEYWORDS_ANALYZED = "resume.keywords-analyzed";

  private JobEventTopics() {}
}
