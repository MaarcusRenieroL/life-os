package com.lifeos.batches.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.GmailScopes;
import com.lifeos.batches.domains.entity.GmailOAuthToken;
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

  public String buildAuthorizationUrl() {
    return new GoogleAuthorizationCodeRequestUrl(
            gmailClientId, gmailRedirectUri, List.of(GmailScopes.GMAIL_READONLY))
        .setAccessType("offline")
        .set("prompt", "consent")
        .build();
  }

  public void handleCallback(String authorizationCode) throws IOException {
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
            .findByUserId(userId)
            .orElseGet(() -> GmailOAuthToken.builder().userId(userId).build());

    gmailOAuthToken.setAccessTokenEncrypted(encryptionService.encrypt(response.getAccessToken()));
    gmailOAuthToken.setRefreshTokenEncrypted(encryptionService.encrypt(response.getRefreshToken()));
    gmailOAuthToken.setExpiresAt(Instant.now().plusSeconds(expiresInSeconds(response)));

    gmailOAuthRepository.save(gmailOAuthToken);
  }

  public GmailConnectionStatus getStatus() {
    UUID userId = UUID.fromString(ownerUserId);

    return gmailOAuthRepository
        .findByUserId(userId)
        .map(token -> new GmailConnectionStatus(true, token.getCreatedAt(), token.getUpdatedAt()))
        .orElseGet(() -> new GmailConnectionStatus(false, null, null));
  }

  public String getValidAccessToken() {
    UUID userId = UUID.fromString(ownerUserId);

    GmailOAuthToken gmailOAuthToken =
        gmailOAuthRepository
            .findByUserId(userId)
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
