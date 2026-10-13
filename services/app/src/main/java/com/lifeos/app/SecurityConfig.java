package com.lifeos.app;

import com.lifeos.common.security.InternalApiKeyFilter;
import com.lifeos.common.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * The one filter chain for every module. Each module used to declare its own with the same shape:
 * a JWT for users, an internal API key for module-to-module calls under
 * {@code /v1/<module>/internal/**}, and a few public endpoints (login, the Gmail OAuth callback).
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final InternalApiKeyFilter internalApiKeyFilter;

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
    return httpSecurity
        .csrf(csrf -> csrf.disable())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            request ->
                request
                    .requestMatchers(
                        "/error",
                        "/v1/auth/register",
                        "/v1/auth/login",
                        "/v1/auth/refresh",
                        "/v1/batches/gmail/callback")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST, "/v1/auth/biometric/challenge", "/v1/auth/biometric/login")
                    .permitAll()
                    .requestMatchers(
                        "/v1/vault/internal/**",
                        "/v1/jobs/internal/**",
                        "/v1/finance/internal/**",
                        "/v1/notes/internal/**",
                        "/v1/habits/internal/**",
                        "/v1/tasks/internal/**",
                        "/v1/workouts/internal/**",
                        "/v1/calendar/internal/**")
                    .hasAuthority("INTERNAL_SERVICE")
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(internalApiKeyFilter, JwtAuthenticationFilter.class)
        .build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
