package com.lifeos.job_tracker.domains.dto.response;

import java.util.List;

/** Everything the job-tracker onboarding gate and the profile page need in one call: whether
 * onboarding is complete (a {@link com.lifeos.job_tracker.domains.entity.CareerProfile} row
 * exists), the profile itself, and the candidate's full work history/projects/skills. */
public record CareerProfileBundleResponse(
    boolean onboarded,
    CareerProfileResponse profile,
    List<WorkExperienceResponse> experiences,
    List<ProjectResponse> projects,
    List<SkillResponse> skills) {}
