package com.lifeos.job_tracker.domains.record;

import com.lifeos.job_tracker.domains.entity.ResumeTemplate;

public record ResumeUploadResult(ResumeTemplate resumeTemplate, String resumeText) {}
