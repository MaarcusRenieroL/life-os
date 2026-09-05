package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * What Claude (or the heuristic fallback) made of an inbound email.
 *
 * @param category one of RECRUITER_OUTREACH, INTERVIEW_INVITE, REJECTION, CONFIRMATION, OFFER, OTHER
 * @param company hiring company, if identifiable
 * @param recruiterName sender's name, if identifiable
 * @param jobTitle role referenced
 * @param jobUrl link to the posting, if present
 * @param interviewDate ISO-8601 instant of a proposed/confirmed interview, if present
 * @param meetingLink video-call link, if present
 * @param salary any salary figure mentioned, as free text
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailClassification(
    String category,
    String company,
    String recruiterName,
    String jobTitle,
    String jobUrl,
    String interviewDate,
    String meetingLink,
    String salary) {}
