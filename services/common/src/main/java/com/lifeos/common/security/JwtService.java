package com.lifeos.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  @Value("${jwt.secret}")
  private String jwtSecret;

  public UUID extractUserId(String token) {
    Claims claims =
        Jwts.parserBuilder().setSigningKey(buildKey()).build().parseClaimsJws(token).getBody();

    return UUID.fromString(claims.getSubject());
  }

  public Boolean isTokenValid(String token) {
    try {
      Jwts.parserBuilder().setSigningKey(buildKey()).build().parseClaimsJws(token);

      return true;
    } catch (Exception exception) {
      return false;
    }
  }

  // Public so services that also issue tokens (auth-service) can reuse the exact
  // same key derivation for signing, instead of duplicating this line themselves.
  public SecretKey buildKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
  }
}
