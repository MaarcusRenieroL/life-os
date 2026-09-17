package com.lifeos.job_tracker.domains.enums;

/** Which resume {@link com.lifeos.job_tracker.service.JobListingService#tailorResume} was built
 * from, recorded per version so tailoring history stays legible after the source changes. */
public enum TailoringBase {
  GLOBAL_RESUME,
  OVERRIDE_RESUME
}
