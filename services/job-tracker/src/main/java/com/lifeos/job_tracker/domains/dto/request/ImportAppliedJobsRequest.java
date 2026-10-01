package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.record.AppliedJobImport;
import java.util.List;

/** The rows the candidate confirmed in the import preview. {@code source} labels where they came from. */
public record ImportAppliedJobsRequest(String source, List<AppliedJobImport.Item> items) {}
