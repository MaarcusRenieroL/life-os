package com.lifeos.job_tracker.domains.dto.response;

import java.util.List;

/** Contacts at the job's company that the user could ask for a referral, plus a draft message. */
public record ReferralSuggestionResponse(
    String company, List<ContactResponse> contacts, String draftMessage) {}
