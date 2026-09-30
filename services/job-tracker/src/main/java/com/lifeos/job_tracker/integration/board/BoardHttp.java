package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.parser.Parser;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Shared JSON transport and text helpers for the board adapters. */
@Component
public class BoardHttp {

  private static final String USER_AGENT = "life-os-job-tracker/1.0 (personal job discovery)";
  private static final int MAX_DESCRIPTION_CHARS = 6000;

  private final RestClient restClient;
  private final ObjectMapper objectMapper;

  public BoardHttp(
      @Qualifier("externalFetchRestClientBuilder") RestClient.Builder builder, ObjectMapper objectMapper) {
    this.restClient = builder.clone().build();
    this.objectMapper = objectMapper;
  }

  public JsonNode get(String url) {
    return restClient
        .get()
        .uri(url)
        .header("User-Agent", USER_AGENT)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .body(String.class)
        .transform(this::parse);
  }

  public JsonNode post(String url, Map<String, Object> body) {
    return restClient
        .post()
        .uri(url)
        .header("User-Agent", USER_AGENT)
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .body(body)
        .retrieve()
        .body(String.class)
        .transform(this::parse);
  }

  // Spring Boot 4's message converters speak Jackson 3, while this module's JsonNode is Jackson 2
  // (see JacksonConfig) - so read the body as text and parse it with the Jackson 2 mapper.
  private JsonNode parse(String raw) {
    try {
      return objectMapper.readTree(raw);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Board returned something that is not JSON", exception);
    }
  }

  public static void requireMatches(String slug, Pattern pattern, String hint) {
    if (slug == null || !pattern.matcher(slug.trim()).matches()) {
      throw new InvalidRequestException("Invalid board slug. Expected " + hint);
    }
  }

  /** Board descriptions arrive as HTML, sometimes entity-escaped a second time (Greenhouse). */
  public static String htmlToText(String html) {
    if (html == null || html.isBlank()) {
      return "";
    }
    String unescaped = html.contains("&lt;") ? Parser.unescapeEntities(html, false) : html;
    return truncate(Jsoup.parse(unescaped).text());
  }

  public static String truncate(String text) {
    if (text == null) {
      return "";
    }
    return text.length() > MAX_DESCRIPTION_CHARS ? text.substring(0, MAX_DESCRIPTION_CHARS) : text;
  }

  /** Boards report time as ISO strings, epoch millis, or nothing at all. */
  public static Instant instant(JsonNode node) {
    if (node == null || node.isNull() || node.asText().isBlank()) {
      return null;
    }
    try {
      if (node.isNumber()) {
        long value = node.asLong();
        return value > 100_000_000_000L ? Instant.ofEpochMilli(value) : Instant.ofEpochSecond(value);
      }
      String text = node.asText();
      try {
        return OffsetDateTime.parse(text).toInstant();
      } catch (RuntimeException notOffset) {
        return java.time.LocalDate.parse(text.substring(0, 10)).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
      }
    } catch (RuntimeException unparseable) {
      return null;
    }
  }

  public static String text(JsonNode node, String field) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || value.isNull() ? "" : value.asText("").trim();
  }
}
