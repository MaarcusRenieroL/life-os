package com.lifeos.vault.config;

import com.lifeos.common.security.InternalApiKeyFilter;
import com.lifeos.common.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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
                    .requestMatchers("/error")
                    .permitAll()
                    .requestMatchers("/v1/vault/internal/**")
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
