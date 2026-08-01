package com.lifeos.auth.domains.record;

import java.time.Instant;

public record ChallengeRecord(String challenge, Instant expiresAt) {}
