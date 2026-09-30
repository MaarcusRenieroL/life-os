package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Someone the candidate knows at a company. {@code note} is free text: "ex-colleague, backend team". */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KnownPerson(String name, String note) {}
