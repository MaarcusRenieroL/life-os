package com.lifeos.auth.service;

import com.lifeos.common.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.util.Date;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// Auth-service is the only service that ever issues tokens (everyone else only
// validates them via the shared JwtService), so this stays here rather than in
// the common module - it just reuses common's key derivation for signing.
@Service
@RequiredArgsConstructor
public class AccessTokenService {

  private final JwtService jwtService;

  @Value("${jwt.access-token-expiration-ms}")
  private int expirationMs;

  public String generateAccessToken(UUID userId) {
    return Jwts.builder()
        .setSubject(userId.toString())
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
        .signWith(jwtService.buildKey(), SignatureAlgorithm.HS256)
        .compact();
  }
}
