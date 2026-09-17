package com.lifeos.job_tracker.controller;

import java.util.UUID;
import org.springframework.security.core.Authentication;

/** Shared helper: the JWT filter stores the authenticated user id as the principal. */
abstract class AuthenticatedController {

  protected UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
