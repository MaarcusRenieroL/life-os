package com.lifeos.batches.service;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import com.lifeos.batches.domains.record.RawAlertEmail;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GmailMessageService {

  @Value("${gmail.alert-senders}")
  private String alertSendersConfig;

  private final GmailOAuthService gmailOAuthService;

  private static final NetHttpTransport TRANSPORT = new NetHttpTransport();
  private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

  public List<RawAlertEmail> fetchRecentAlerts() throws IOException {
    Gmail gmail = buildGmailClient();

    List<String> senderAddresses = List.of(alertSendersConfig.split(","));
    String query = "newer_than:1d (from:" + String.join(" OR from:", senderAddresses) + ")";

    ListMessagesResponse listResponse = gmail.users().messages().list("me").setQ(query).execute();

    if (listResponse.getMessages() == null) {
      return List.of();
    }

    return listResponse.getMessages().stream()
        .map(
            messageStub -> {
              try {
                Message message =
                    gmail.users().messages().get("me", messageStub.getId()).setFormat("full").execute();

                return toRawAlertEmail(message);
              } catch (IOException e) {
                throw new RuntimeException("Failed to fetch Gmail message: " + messageStub.getId(), e);
              }
            })
        .toList();
  }

  private RawAlertEmail toRawAlertEmail(Message message) {
    MessagePart payload = message.getPayload();

    String fromAddress = header(payload, "From");
    String subject = header(payload, "Subject");
    String body = decodeBody(payload);
    Instant receivedAt = Instant.ofEpochMilli(message.getInternalDate());

    return new RawAlertEmail(message.getId(), fromAddress, subject, body, receivedAt);
  }

  private String header(MessagePart payload, String name) {
    return payload.getHeaders().stream()
        .filter(header -> header.getName().equals(name))
        .findFirst()
        .map(MessagePartHeader::getValue)
        .orElseThrow(() -> new IllegalStateException("Missing header: " + name));
  }

  private String decodeBody(MessagePart payload) {
    String encodedBody;

    if (payload.getParts() == null) {
      encodedBody = payload.getBody().getData();
    } else {
      Optional<MessagePart> textPart =
          payload.getParts().stream().filter(part -> "text/plain".equals(part.getMimeType())).findFirst();

      encodedBody =
          textPart
              .orElseThrow(() -> new IllegalStateException("No text/plain part found"))
              .getBody()
              .getData();
    }

    return new String(Base64.getUrlDecoder().decode(encodedBody), StandardCharsets.UTF_8);
  }

  private Gmail buildGmailClient() {
    return new Gmail.Builder(
            TRANSPORT,
            JSON_FACTORY,
            request ->
                request
                    .getHeaders()
                    .setAuthorization("Bearer " + gmailOAuthService.getValidAccessToken()))
        .setApplicationName("life-os-batches")
        .build();
  }
}
