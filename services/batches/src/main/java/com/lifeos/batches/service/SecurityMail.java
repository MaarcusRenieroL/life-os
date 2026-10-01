package com.lifeos.batches.service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Recognises security-code mail (OTPs, login and verification codes, password resets). The email hub
 * must never fetch, store or send these to a model: the code itself would end up in a database row.
 * The Gmail search excludes the obvious subjects; this is the second line of defence on whatever
 * still gets through.
 */
final class SecurityMail {

  /** Subject phrases, also used as Gmail {@code -subject:} terms so these are never fetched. */
  static final List<String> SUBJECT_PHRASES =
      List.of(
          "otp",
          "one-time password",
          "one time password",
          "verification code",
          "security code",
          "login code",
          "sign-in code",
          "passcode",
          "password reset",
          "reset your password",
          "authentication code",
          "verify your email",
          "confirm your email",
          "sudo email verification");

  private static final Pattern SUBJECT =
      Pattern.compile(
          "\\b(otp|one[- ]time (password|passcode|pin)|(verification|security|login|sign-?in|authentication|confirmation) code|passcode|password reset|reset your password|verify your (email|account|identity)|confirm your email)\\b",
          Pattern.CASE_INSENSITIVE);

  private static final Pattern BODY =
      Pattern.compile(
          "(\\b(otp|one[- ]time (password|passcode))\\b|(verification|security|login|authentication) code|do not share (this|your) (code|otp)|valid for \\d+ ?(minutes|mins))",
          Pattern.CASE_INSENSITIVE);

  private SecurityMail() {}

  static boolean matches(String subject, String body) {
    if (subject != null && SUBJECT.matcher(subject).find()) {
      return true;
    }
    if (body == null) {
      return false;
    }
    String head = body.length() > 400 ? body.substring(0, 400) : body;
    return BODY.matcher(head).find();
  }
}
