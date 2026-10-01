package com.lifeos.batches.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.GmailScopes;
import com.lifeos.batches.domains.entity.GmailOAuthToken;
import com.lifeos.batches.domains.enums.GmailPurpose;
import com.lifeos.batches.domains.record.GmailConnectionStatus;
import com.lifeos.batches.repository.GmailOAuthRepository;
import com.lifeos.common.security.EncryptionService;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GmailOAuthService {

  @Value("${gmail.client-id}")
  private String gmailClientId;

  @Value("${gmail.client-secret}")
  private String gmailClientSecret;

  @Value("${gmail.redirect-uri}")
  private String gmailRedirectUri;

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final GmailOAuthRepository gmailOAuthRepository;

  private final EncryptionService encryptionService;

  private static final NetHttpTransport NET_HTTP_TRANSPORT = new NetHttpTransport();
  private static final GsonFactory GSON_FACTORY = new GsonFactory().getDefaultInstance();

  public String buildAuthorizationUrl(GmailPurpose purpose) {
    return new GoogleAuthorizationCodeRequestUrl(
            gmailClientId, gmailRedirectUri, List.of(GmailScopes.GMAIL_READONLY))
        .setAccessType("offline")
        .set("prompt", "select_account consent")
        // Round-trips through Google so the callback knows which mailbox this is.
        .setState(purpose.name())
        .build();
  }

  public void handleCallback(String authorizationCode, String state) throws IOException {
    GmailPurpose purpose = parsePurpose(state);

    GoogleTokenResponse response =
        new GoogleAuthorizationCodeTokenRequest(
                NET_HTTP_TRANSPORT,
                GSON_FACTORY,
                gmailClientId,
                gmailClientSecret,
                authorizationCode,
                gmailRedirectUri)
            .execute();

    UUID userId = UUID.fromString(ownerUserId);

    GmailOAuthToken gmailOAuthToken =
        gmailOAuthRepository
            .findByUserIdAndPurpose(userId, purpose)
            .orElseGet(() -> GmailOAuthToken.builder().userId(userId).purpose(purpose).build());

    gmailOAuthToken.setAccessTokenEncrypted(encryptionService.encrypt(response.getAccessToken()));
    gmailOAuthToken.setRefreshTokenEncrypted(encryptionService.encrypt(response.getRefreshToken()));
    gmailOAuthToken.setExpiresAt(Instant.now().plusSeconds(expiresInSeconds(response)));
    gmailOAuthToken.setEmail(mailboxAddress(response.getAccessToken()));

    gmailOAuthRepository.save(gmailOAuthToken);
  }

  private static GmailPurpose parsePurpose(String state) {
    try {
      return GmailPurpose.valueOf(state == null ? "FINANCE" : state.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      return GmailPurpose.FINANCE;
    }
  }

  public GmailConnectionStatus getStatus() {
    UUID userId = UUID.fromString(ownerUserId);

    List<GmailConnectionStatus.Mailbox> mailboxes =
        gmailOAuthRepository.findAllByUserId(userId).stream()
            .map(
                token ->
                    new GmailConnectionStatus.Mailbox(
                        token.getPurpose().name(),
                        addressOf(token),
                        token.getCreatedAt(),
                        token.getUpdatedAt()))
            .toList();

    GmailConnectionStatus.Mailbox finance =
        mailboxes.stream().filter(m -> m.purpose().equals("FINANCE")).findFirst().orElse(null);
    GmailConnectionStatus.Mailbox primary = finance != null ? finance : mailboxes.stream().findFirst().orElse(null);

    return primary == null
        ? new GmailConnectionStatus(false, null, null, null, mailboxes)
        : new GmailConnectionStatus(
            true, primary.connectedAt(), primary.lastRefreshedAt(), primary.email(), mailboxes);
  }

  /** The purposes that have a mailbox connected, so inbox-wide jobs can visit each one. */
  public List<GmailPurpose> connectedPurposes() {
    return gmailOAuthRepository.findAllByUserId(UUID.fromString(ownerUserId)).stream()
        .map(GmailOAuthToken::getPurpose)
        .toList();
  }

  /** Stored address, learned lazily for connections that predate purposes. */
  private String addressOf(GmailOAuthToken token) {
    if (token.getEmail() == null) {
      try {
        token.setEmail(mailboxAddress(getValidAccessToken(token.getPurpose())));
        gmailOAuthRepository.save(token);
      } catch (Exception ignored) {
        // status must never fail because Google is unreachable
      }
    }
    return token.getEmail();
  }

  private static String mailboxAddress(String accessToken) {
    try {
      return new Gmail.Builder(
              NET_HTTP_TRANSPORT,
              GSON_FACTORY,
              request -> request.getHeaders().setAuthorization("Bearer " + accessToken))
          .setApplicationName("life-os")
          .build()
          .users()
          .getProfile("me")
          .execute()
          .getEmailAddress();
    } catch (Exception e) {
      return null;
    }
  }

  /**
   * A valid access token for the mailbox serving {@code purpose}. When only one mailbox is
   * connected it serves every purpose, so single-address setups keep working unchanged.
   */
  public String getValidAccessToken(GmailPurpose purpose) {
    UUID userId = UUID.fromString(ownerUserId);

    GmailOAuthToken gmailOAuthToken =
        gmailOAuthRepository
            .findByUserIdAndPurpose(userId, purpose)
            .or(() -> gmailOAuthRepository.findAllByUserId(userId).stream().findFirst())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Gmail account not connected - visit /v1/batches/gmail/connect first"));

    if (gmailOAuthToken.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
      return encryptionService.decrypt(gmailOAuthToken.getAccessTokenEncrypted());
    }

    return refreshAccessToken(gmailOAuthToken);
  }

  private String refreshAccessToken(GmailOAuthToken gmailOAuthToken) {
    try {
      String refreshToken = encryptionService.decrypt(gmailOAuthToken.getRefreshTokenEncrypted());

      GoogleTokenResponse response =
          new GoogleRefreshTokenRequest(
                  NET_HTTP_TRANSPORT, GSON_FACTORY, refreshToken, gmailClientId, gmailClientSecret)
              .execute();

      gmailOAuthToken.setAccessTokenEncrypted(encryptionService.encrypt(response.getAccessToken()));
      gmailOAuthToken.setExpiresAt(Instant.now().plusSeconds(expiresInSeconds(response)));

      gmailOAuthRepository.save(gmailOAuthToken);

      return response.getAccessToken();
    } catch (IOException e) {
      throw new RuntimeException("Failed to refresh Gmail access token", e);
    }
  }

  private long expiresInSeconds(GoogleTokenResponse response) {
    Long expiresIn = response.getExpiresInSeconds();

    return expiresIn != null ? expiresIn : 3600L;
  }
}
