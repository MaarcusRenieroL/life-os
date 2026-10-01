package com.lifeos.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class InternalApiKeyFilter extends OncePerRequestFilter {

  @Value("${internal.api-key}")
  private String internalApiKey;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String providedKey = request.getHeader("X-Internal-Api-Key");

    if (providedKey != null && constantTimeEquals(providedKey, internalApiKey)) {
      UsernamePasswordAuthenticationToken authToken =
          new UsernamePasswordAuthenticationToken(
              "internal-service", null, List.of(new SimpleGrantedAuthority("INTERNAL_SERVICE")));

      SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    filterChain.doFilter(request, response);
  }

  /** MessageDigest.isEqual runs in time independent of where the first mismatching byte is,
   * unlike String.equals - the internal API key is a bearer credential, so a timing side
   * channel that narrows it down byte-by-byte is worth closing even on an internal network. */
  private static boolean constantTimeEquals(String provided, String expected) {
    if (expected == null) {
      return false;
    }
    return MessageDigest.isEqual(
        provided.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8));
  }
}
