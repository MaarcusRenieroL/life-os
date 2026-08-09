package com.lifeos.job_tracker.domains.record;

// Field names must match Resend's API exactly - "from"/"to"/"subject"/"html".
public record ResendEmailRequest(String from, String to, String subject, String html) {}
