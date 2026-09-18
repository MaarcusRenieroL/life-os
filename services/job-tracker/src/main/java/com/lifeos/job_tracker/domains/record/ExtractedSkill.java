package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

/** One skill Claude pulled out of a resume. All fields may be null if the model was unsure. */
public record ExtractedSkill(
    String name,
    String category,
    String proficiency,
    @JsonDeserialize(using = LenientYearsDeserializer.class) Double yearsOfExperience,
    Double confidence) {}
