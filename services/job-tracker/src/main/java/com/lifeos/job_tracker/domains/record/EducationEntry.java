package com.lifeos.job_tracker.domains.record;

/** One education entry, shaped to slot directly into the resume template's
 * {@code \resumeSubheading{school}{dates}{degree}{location}} - "degree" carries the full degree
 * line (field of study, GPA) as free text rather than separate fields, since that's how it
 * actually reads on the page. */
public record EducationEntry(String school, String degree, String location, String dates) {}
