package com.lifeos.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param autoApply act on HIGH-confidence emails straight away (each can be undone). Off means
 *     every proposal waits for a yes in the inbox.
 * @param zone the zone email times are read in and "today" is decided in
 * @param claudeFallback let a classification fall back to Claude when the local model is
 *     unavailable. Off by default: email is the most private thing the app sees, and the local model
 *     is free, so it stays local unless this is turned on deliberately.
 */
@ConfigurationProperties(prefix = "email-hub")
public record EmailHubProperties(Boolean autoApply, String zone, Boolean claudeFallback) {

  public boolean autoApplyEnabled() {
    return autoApply == null || autoApply;
  }

  public boolean claudeFallbackEnabled() {
    return Boolean.TRUE.equals(claudeFallback);
  }

  public String zoneOrDefault() {
    return zone == null || zone.isBlank() ? "Asia/Kolkata" : zone;
  }
}
