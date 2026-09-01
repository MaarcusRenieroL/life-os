package com.lifeos.job_tracker.domains.record;

/** One skill Claude pulled out of a resume. All fields may be null if the model was unsure. */
public record ExtractedSkill(
    String name, String category, String proficiency, Double yearsOfExperience, Double confidence) {}
