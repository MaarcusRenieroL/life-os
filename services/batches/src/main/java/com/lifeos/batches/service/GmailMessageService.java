package com.lifeos.batches.service;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import com.lifeos.batches.domains.record.RawAlertEmail;
import com.lifeos.batches.domains.record.RawEmail;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GmailMessageService {

  private static final Logger log = LoggerFactory.getLogger(GmailMessageService.class);

  @Value("${gmail.alert-senders}")
  private String alertSendersConfig;

  private final GmailOAuthService gmailOAuthService;

  private static final NetHttpTransport TRANSPORT = new NetHttpTransport();
  private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

  public List<RawAlertEmail> fetchRecentAlerts() throws IOException {
    return fetchAlerts("newer_than:2d");
  }

  // Full historical sync - no date restriction, pulls every matching alert
  // email ever received. Separate from the regular 2-day poll (which exists
  // to keep the scheduled job fast and cheap), triggered manually since it
  // can be a large one-time fetch.
  public List<RawAlertEmail> fetchAllAlerts() throws IOException {
    return fetchAlerts(null);
  }

  private List<RawAlertEmail> fetchAlerts(String dateRestriction) throws IOException {
    List<String> senderAddresses = List.of(alertSendersConfig.split(","));
    String senderClause = "(from:" + String.join(" OR from:", senderAddresses) + ")";

    return fetchByQuery(senderClause, dateRestriction).stream()
        .map(
            email ->
                new RawAlertEmail(
                    email.messageId(), email.fromAddress(), email.subject(), email.body(), email.receivedAt()))
        .toList();
  }

  /**
   * Generic search, for consumers other than the bank-alert pipeline (e.g. job-search email sync)
   * that need their own query clause rather than the fixed sender allowlist above.
   */
  public List<RawEmail> fetchByQuery(String searchClause, String dateRestriction) throws IOException {
    Gmail gmail = buildGmailClient();

    String query = dateRestriction == null ? searchClause : dateRestriction + " " + searchClause;

    log.info("Gmail search query: {}", query);

    // Gmail's messages().list() paginates (default ~100 per page) - a flat
    // single call silently truncated results for any account with more
    // matching mail than one page, which is exactly why a full sync never
    // actually returned "all" transactions. Page through nextPageToken until
    // it's exhausted.
    List<Message> messageStubs = new ArrayList<>();
    String pageToken = null;
    do {
      ListMessagesResponse listResponse =
          gmail.users().messages().list("me").setQ(query).setPageToken(pageToken).execute();
      if (listResponse.getMessages() != null) {
        messageStubs.addAll(listResponse.getMessages());
      }
      pageToken = listResponse.getNextPageToken();
    } while (pageToken != null);

    log.info("Gmail search returned {} messages", messageStubs.size());

    return messageStubs.stream()
        .map(
            messageStub -> {
              try {
                Message message =
                    gmail.users().messages().get("me", messageStub.getId()).setFormat("full").execute();

                return toRawEmail(message);
              } catch (Exception e) {
                // One malformed/unexpected message (odd MIME structure, missing
                // header, etc.) shouldn't take down the whole poll - skip it and
                // keep going. Real mailboxes mix in mailing-list/marketing mail
                // alongside whatever this query is actually looking for.
                log.warn("Skipping Gmail message {}: {}", messageStub.getId(), e.getMessage());

                return null;
              }
            })
        .filter(Objects::nonNull)
        .toList();
  }

  private RawEmail toRawEmail(Message message) {
    MessagePart payload = message.getPayload();

    String fromAddress = header(payload, "From");
    String toAddress = headerOrNull(payload, "To");
    String subject = header(payload, "Subject");
    String body = decodeBody(payload);
    Instant receivedAt = Instant.ofEpochMilli(message.getInternalDate());

    return new RawEmail(message.getId(), message.getThreadId(), fromAddress, toAddress, subject, body, receivedAt);
  }

  private String header(MessagePart payload, String name) {
    String value = headerOrNull(payload, name);
    if (value == null) {
      throw new IllegalStateException("Missing header: " + name);
    }
    return value;
  }

  private String headerOrNull(MessagePart payload, String name) {
    return payload.getHeaders().stream()
        .filter(header -> header.getName().equals(name))
        .findFirst()
        .map(MessagePartHeader::getValue)
        .orElse(null);
  }

  private String decodeBody(MessagePart payload) {
    Optional<MessagePart> textPlainPart = findPartByMimeType(payload, "text/plain");

    if (textPlainPart.isPresent()) {
      return decodePartData(textPlainPart.get());
    }

    // Some bank alerts (e.g. HDFC's richer templates with banner images) are
    // sent as HTML-only, with no text/plain alternative at all - not a
    // nesting issue, there's genuinely nothing else to fall back to but the
    // HTML part itself, tags stripped.
    MessagePart htmlPart =
        findPartByMimeType(payload, "text/html")
            .orElseThrow(() -> new IllegalStateException("No text/plain or text/html part found"));

    return stripHtml(decodePartData(htmlPart));
  }

  private String decodePartData(MessagePart part) {
    return new String(
        Base64.getUrlDecoder().decode(part.getBody().getData()), StandardCharsets.UTF_8);
  }

  // Bank alert HTML is simple transactional markup, not a full web page - a
  // crude tag-strip is enough to recover the plain-text content the same
  // regexes in HdfcCreditCardAlertParser etc. expect, without pulling in an
  // actual HTML parser dependency for this one use case.
  private String stripHtml(String html) {
    String withoutTags = html.replaceAll("(?s)<[^>]*>", " ");

    String withEntitiesDecoded =
        withoutTags
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&#39;", "'")
            .replace("&quot;", "\"");

    return withEntitiesDecoded.replaceAll("\\s+", " ").trim();
  }

  // MIME parts can nest arbitrarily deep - a multipart/alternative (text vs
  // html) is often itself wrapped inside a multipart/mixed (if there's an
  // attachment), so a flat scan of payload.getParts() isn't enough. Depth-first
  // search until a leaf of the requested mimeType is found.
  private Optional<MessagePart> findPartByMimeType(MessagePart part, String mimeType) {
    if (mimeType.equals(part.getMimeType())) {
      return Optional.of(part);
    }

    if (part.getParts() == null) {
      return Optional.empty();
    }

    for (MessagePart child : part.getParts()) {
      Optional<MessagePart> found = findPartByMimeType(child, mimeType);

      if (found.isPresent()) {
        return found;
      }
    }

    return Optional.empty();
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
