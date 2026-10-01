package com.lifeos.core.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.EmailHubEventRecord;
import com.lifeos.core.config.EmailHubProperties;
import com.lifeos.core.domains.entity.EmailHubItem;
import com.lifeos.core.domains.enums.EmailCategory;
import com.lifeos.core.domains.enums.EmailHubStatus;
import com.lifeos.core.domains.record.EmailAction;
import com.lifeos.core.domains.record.EmailClassification;
import com.lifeos.core.exception.AiUnavailableException;
import com.lifeos.core.exception.ResourceNotFoundException;
import com.lifeos.core.integration.EmailHubAiClient;
import com.lifeos.core.repository.EmailHubItemRepository;
import java.time.Instant;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * The email hub: turns an inbox email into a task, calendar event or subscription - or leaves it
 * alone. Every email it looks at is recorded, which is both how it avoids reading the same one twice
 * and what the inbox page shows, including the things it decided to ignore.
 *
 * <p>Deliberately not {@code @Transactional}: classification is a slow network call to a model, and
 * a database transaction must not be held open across it. Each save is its own short transaction.
 */
@Service
public class EmailHubService {

  private static final Logger log = LoggerFactory.getLogger(EmailHubService.class);
  private static final int SNIPPET_CHARS = 240;

  private final EmailHubItemRepository repository;
  private final EmailHubAiClient aiClient;
  private final EmailActionExecutor executor;
  private final EmailHubProperties properties;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  public EmailHubService(
      EmailHubItemRepository repository,
      EmailHubAiClient aiClient,
      EmailActionExecutor executor,
      EmailHubProperties properties) {
    this.repository = repository;
    this.aiClient = aiClient;
    this.executor = executor;
    this.properties = properties;
  }

  // -- ingest -------------------------------------------------------------

  public void ingest(EmailHubEventRecord event) {
    if (event.gmailMessageId() == null
        || repository.existsByUserIdAndGmailMessageId(event.userId(), event.gmailMessageId())) {
      return;
    }

    EmailClassification classification;
    try {
      classification = aiClient.classify(event.fromAddress(), event.subject(), event.body());
    } catch (AiUnavailableException unavailable) {
      // Recorded nowhere on purpose: the next poll offers this email again once a model is back.
      log.warn("Email hub skipped {}: {}", event.gmailMessageId(), unavailable.getMessage());
      return;
    }

    ZoneId zone = ZoneId.of(properties.zoneOrDefault());
    EmailActionPlanner.Decision decision = EmailActionPlanner.decide(classification, Instant.now(), zone);

    EmailHubItem item = baseItem(event, classification, decision);
    switch (decision.verdict()) {
      case IGNORE -> {
        item.setStatus(EmailHubStatus.IGNORED);
        item.setNote(decision.reason());
      }
      case REVIEW -> {
        item.setStatus(EmailHubStatus.NEEDS_REVIEW);
        item.setNote(decision.reason());
      }
      case AUTO -> {
        if (properties.autoApplyEnabled()) {
          apply(item, decision.action());
        } else {
          item.setStatus(EmailHubStatus.NEEDS_REVIEW);
        }
      }
    }
    repository.save(item);
  }

  private EmailHubItem baseItem(EmailHubEventRecord event, EmailClassification c, EmailActionPlanner.Decision decision) {
    return EmailHubItem.builder()
        .userId(event.userId())
        .gmailMessageId(event.gmailMessageId())
        .fromAddress(clip(event.fromAddress(), 500))
        .subject(clip(event.subject(), 1000))
        .snippet(snippet(event.body()))
        .receivedAt(event.receivedAt())
        .category(decision.category() == null ? EmailCategory.IGNORE : decision.category())
        .confidence(c == null || c.confidence() == null ? null : clip(c.confidence().toUpperCase(), 10))
        .summary(c == null ? null : clip(c.summary(), 500))
        .proposal(decision.action() == null ? null : objectMapper.convertValue(decision.action(), new TypeReference<Map<String, Object>>() {}))
        .build();
  }

  // -- the candidate's decisions ------------------------------------------

  private static final Set<EmailHubStatus> PENDING_AND_DONE =
      EnumSet.of(EmailHubStatus.NEEDS_REVIEW, EmailHubStatus.APPLIED, EmailHubStatus.FAILED, EmailHubStatus.UNDONE);

  public List<EmailHubItem> list(UUID userId, Set<EmailHubStatus> statuses, int limit) {
    Set<EmailHubStatus> wanted = statuses == null || statuses.isEmpty() ? PENDING_AND_DONE : statuses;
    return repository.findByUserIdAndStatusInOrderByCreatedAtDesc(userId, wanted, PageRequest.of(0, Math.min(Math.max(limit, 1), 200)));
  }

  public long pendingCount(UUID userId) {
    return repository.countByUserIdAndStatus(userId, EmailHubStatus.NEEDS_REVIEW);
  }

  /** Carries out a proposal that was waiting for a yes. */
  public EmailHubItem approve(UUID userId, UUID id) {
    EmailHubItem item = owned(userId, id);
    if (item.getStatus() != EmailHubStatus.NEEDS_REVIEW && item.getStatus() != EmailHubStatus.FAILED) {
      return item;
    }
    if (item.getProposal() == null) {
      item.setStatus(EmailHubStatus.FAILED);
      item.setNote("There is nothing concrete to create from this email - the details were missing.");
      return repository.save(item);
    }
    apply(item, objectMapper.convertValue(item.getProposal(), EmailAction.class));
    return repository.save(item);
  }

  public EmailHubItem dismiss(UUID userId, UUID id) {
    EmailHubItem item = owned(userId, id);
    if (item.getStatus() == EmailHubStatus.NEEDS_REVIEW || item.getStatus() == EmailHubStatus.FAILED) {
      item.setStatus(EmailHubStatus.DISMISSED);
      repository.save(item);
    }
    return item;
  }

  /** Reverts an applied item by removing what it created. */
  public EmailHubItem undo(UUID userId, UUID id) {
    EmailHubItem item = owned(userId, id);
    if (item.getStatus() != EmailHubStatus.APPLIED || item.getTargetId() == null) {
      return item;
    }
    try {
      executor.undo(userId, item.getTargetModule(), item.getTargetId());
    } catch (EmailActionExecutor.EmailActionException failure) {
      // The record may already have been deleted by hand - that still counts as undone.
      log.warn("Undo of email item {} failed: {}", id, failure.getMessage());
      item.setNote("Couldn't remove it automatically (" + failure.getMessage() + "). Check the module.");
      return repository.save(item);
    }
    item.setStatus(EmailHubStatus.UNDONE);
    item.setNote(null);
    return repository.save(item);
  }

  // -- shared -------------------------------------------------------------

  private void apply(EmailHubItem item, EmailAction action) {
    try {
      EmailActionExecutor.Result result = executor.execute(item.getUserId(), action);
      item.setTargetModule(result.module());
      item.setTargetId(result.targetId());
      item.setNote(result.note());
      // Something that already existed was not created by us, so there is nothing to undo.
      item.setStatus(result.created() ? EmailHubStatus.APPLIED : EmailHubStatus.IGNORED);
    } catch (EmailActionExecutor.EmailActionException failure) {
      log.warn("Email hub could not apply {}: {}", item.getGmailMessageId(), failure.getMessage());
      item.setStatus(EmailHubStatus.FAILED);
      item.setNote(clip(failure.getMessage(), 500));
    }
  }

  private EmailHubItem owned(UUID userId, UUID id) {
    return repository.findByIdAndUserId(id, userId).orElseThrow(() -> new ResourceNotFoundException("Email item not found: " + id));
  }

  private static String snippet(String body) {
    if (body == null) return null;
    String flat = body.strip().replaceAll("\\s+", " ");
    return flat.length() <= SNIPPET_CHARS ? flat : flat.substring(0, SNIPPET_CHARS) + "…";
  }

  private static String clip(String value, int max) {
    if (value == null) return null;
    return value.length() <= max ? value : value.substring(0, max);
  }
}
