package com.lifeos.batches.service;

import com.lifeos.batches.domains.record.ParsedAlert;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GmailAlertParsingService {

  private final List<BankAlertParser> parsers;

  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    return parsers.stream()
        .filter(p -> p.supports(fromAddress))
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("No parser found for sender: " + fromAddress))
        .parse(messageId, fromAddress, subject, body, receivedAt);
  }
}
