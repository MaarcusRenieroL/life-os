package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.CreateGoalLinkRequest;
import com.lifeos.tasks.domains.dto.request.LogMetricEntryRequest;
import com.lifeos.tasks.domains.dto.request.SaveMetricRequest;
import com.lifeos.tasks.domains.dto.request.SaveMilestoneRequest;
import com.lifeos.tasks.domains.dto.request.SubmitGoalReviewRequest;
import com.lifeos.tasks.domains.dto.response.GoalLinkResponse;
import com.lifeos.tasks.domains.dto.response.GoalMetricEntryResponse;
import com.lifeos.tasks.domains.dto.response.GoalMetricResponse;
import com.lifeos.tasks.domains.dto.response.GoalMilestoneResponse;
import com.lifeos.tasks.domains.dto.response.GoalReviewResponse;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.GoalLink;
import com.lifeos.tasks.domains.entity.GoalMetric;
import com.lifeos.tasks.domains.entity.GoalMetricEntry;
import com.lifeos.tasks.domains.entity.GoalMilestone;
import com.lifeos.tasks.domains.entity.GoalReview;
import com.lifeos.tasks.domains.enums.GoalLinkType;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalLinkRepository;
import com.lifeos.tasks.repository.GoalMetricEntryRepository;
import com.lifeos.tasks.repository.GoalMetricRepository;
import com.lifeos.tasks.repository.GoalMilestoneRepository;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.repository.GoalReviewRepository;
import com.lifeos.tasks.service.GoalProgressAssembler.GoalProgress;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Everything hanging off a goal: milestones, custom metrics (and their logged entries), links to
 * other goals, and periodic reviews. Every mutation re-syncs the goal's status, since each of
 * these feeds its progress. Ownership is always checked through the goal, so a child id from
 * another user's goal 404s the same as a missing one. */
@Service
@RequiredArgsConstructor
@Transactional
public class GoalItemsService {

  // How many entries a metric carries inline on the goal detail - enough for a sparkline; the
  // full history is one call away.
  private static final int INLINE_ENTRY_LIMIT = 30;

  private final GoalRepository goalRepository;
  private final GoalMilestoneRepository milestoneRepository;
  private final GoalMetricRepository metricRepository;
  private final GoalMetricEntryRepository entryRepository;
  private final GoalLinkRepository linkRepository;
  private final GoalReviewRepository reviewRepository;
  private final GoalStatusSyncer statusSyncer;

  // ---- milestones ----

  @Transactional(readOnly = true)
  public List<GoalMilestoneResponse> milestones(UUID goalId) {
    return milestoneRepository.findAllByGoalIdOrderByTargetDateAscCreatedAtAsc(goalId).stream()
        .map(this::toResponse)
        .toList();
  }

  public GoalMilestoneResponse addMilestone(UUID userId, UUID goalId, SaveMilestoneRequest request) {
    Goal goal = owned(userId, goalId);
    GoalMilestone milestone =
        GoalMilestone.builder()
            .goalId(goalId)
            .userId(userId)
            .title(request.title().trim())
            .targetDate(request.targetDate())
            .completedAt(Boolean.TRUE.equals(request.completed()) ? Instant.now() : null)
            .build();
    GoalMilestone saved = milestoneRepository.save(milestone);
    statusSyncer.sync(userId, goal);
    return toResponse(saved);
  }

  public GoalMilestoneResponse updateMilestone(UUID userId, UUID goalId, UUID id, SaveMilestoneRequest request) {
    Goal goal = owned(userId, goalId);
    GoalMilestone milestone =
        milestoneRepository
            .findByIdAndGoalIdAndUserId(id, goalId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Milestone", id));
    milestone.setTitle(request.title().trim());
    milestone.setTargetDate(request.targetDate());
    if (request.completed() != null) {
      boolean done = request.completed();
      // Re-ticking an already-complete milestone must keep its original completion time.
      if (done && milestone.getCompletedAt() == null) milestone.setCompletedAt(Instant.now());
      if (!done) milestone.setCompletedAt(null);
    }
    GoalMilestone saved = milestoneRepository.save(milestone);
    statusSyncer.sync(userId, goal);
    return toResponse(saved);
  }

  public void deleteMilestone(UUID userId, UUID goalId, UUID id) {
    Goal goal = owned(userId, goalId);
    milestoneRepository.delete(
        milestoneRepository
            .findByIdAndGoalIdAndUserId(id, goalId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Milestone", id)));
    statusSyncer.sync(userId, goal);
  }

  // ---- metrics ----

  @Transactional(readOnly = true)
  public List<GoalMetricResponse> metrics(UUID goalId) {
    return metricRepository.findAllByGoalIdOrderByCreatedAtAsc(goalId).stream()
        .map(m -> toResponse(m, INLINE_ENTRY_LIMIT))
        .toList();
  }

  public GoalMetricResponse addMetric(UUID userId, UUID goalId, SaveMetricRequest request) {
    Goal goal = owned(userId, goalId);
    GoalMetric metric = GoalMetric.builder().goalId(goalId).userId(userId).build();
    applyMetric(metric, request);
    GoalMetric saved = metricRepository.save(metric);
    statusSyncer.sync(userId, goal);
    return toResponse(saved, INLINE_ENTRY_LIMIT);
  }

  public GoalMetricResponse updateMetric(UUID userId, UUID goalId, UUID id, SaveMetricRequest request) {
    Goal goal = owned(userId, goalId);
    GoalMetric metric = ownedMetric(userId, goalId, id);
    applyMetric(metric, request);
    GoalMetric saved = metricRepository.save(metric);
    statusSyncer.sync(userId, goal);
    return toResponse(saved, INLINE_ENTRY_LIMIT);
  }

  public void deleteMetric(UUID userId, UUID goalId, UUID id) {
    Goal goal = owned(userId, goalId);
    metricRepository.delete(ownedMetric(userId, goalId, id));
    statusSyncer.sync(userId, goal);
  }

  @Transactional(readOnly = true)
  public List<GoalMetricEntryResponse> entries(UUID userId, UUID goalId, UUID metricId) {
    owned(userId, goalId);
    ownedMetric(userId, goalId, metricId);
    return entryRepository.findAllByMetricIdOrderByRecordedOnDescCreatedAtDesc(metricId).stream()
        .map(this::toResponse)
        .toList();
  }

  public GoalMetricResponse logEntry(UUID userId, UUID goalId, UUID metricId, LogMetricEntryRequest request) {
    Goal goal = owned(userId, goalId);
    GoalMetric metric = ownedMetric(userId, goalId, metricId);
    LocalDate recordedOn = request.recordedOn() == null ? LocalDate.now() : request.recordedOn();
    if (recordedOn.isAfter(LocalDate.now())) {
      throw new InvalidRequestException("An entry can't be dated in the future");
    }
    entryRepository.save(
        GoalMetricEntry.builder()
            .metricId(metricId)
            .userId(userId)
            .value(request.value())
            .note(request.note() == null || request.note().isBlank() ? null : request.note().trim())
            .recordedOn(recordedOn)
            .build());
    statusSyncer.sync(userId, goal);
    return toResponse(metric, INLINE_ENTRY_LIMIT);
  }

  public GoalMetricResponse deleteEntry(UUID userId, UUID goalId, UUID metricId, UUID entryId) {
    Goal goal = owned(userId, goalId);
    GoalMetric metric = ownedMetric(userId, goalId, metricId);
    entryRepository.delete(
        entryRepository
            .findByIdAndMetricIdAndUserId(entryId, metricId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Metric entry", entryId)));
    statusSyncer.sync(userId, goal);
    return toResponse(metric, INLINE_ENTRY_LIMIT);
  }

  // ---- links to other goals ----

  /** Resolves each stored link against the goal being viewed: a link where this goal is the
   * source reads BLOCKS/SUPPORTS, one where it's the target reads BLOCKED_BY/SUPPORTED_BY. */
  public List<GoalLinkResponse> linksFor(
      UUID goalId, List<GoalLink> allLinks, Map<UUID, Goal> goalsById, Map<UUID, GoalProgress> progress) {
    List<GoalLinkResponse> result = new ArrayList<>();
    for (GoalLink link : allLinks) {
      boolean outgoing = goalId.equals(link.getSourceGoalId());
      if (!outgoing && !goalId.equals(link.getTargetGoalId())) continue;

      UUID otherId = outgoing ? link.getTargetGoalId() : link.getSourceGoalId();
      Goal other = goalsById.get(otherId);
      if (other == null) continue;

      String relation =
          link.getLinkType() == GoalLinkType.BLOCKS
              ? (outgoing ? "BLOCKS" : "BLOCKED_BY")
              : (outgoing ? "SUPPORTS" : "SUPPORTED_BY");
      GoalProgress otherProgress = progress.get(otherId);
      result.add(
          new GoalLinkResponse(
              link.getId(),
              relation,
              otherId,
              other.getName(),
              otherProgress == null ? other.getStatus() : otherProgress.effectiveStatus()));
    }
    return result;
  }

  public void addLink(UUID userId, UUID goalId, CreateGoalLinkRequest request) {
    owned(userId, goalId);
    UUID targetId = request.targetGoalId();
    if (goalId.equals(targetId)) throw new InvalidRequestException("A goal can't be linked to itself");
    owned(userId, targetId);

    if (linkRepository.existsBySourceGoalIdAndTargetGoalIdAndLinkType(goalId, targetId, request.linkType())) {
      throw new InvalidRequestException("Those goals are already linked that way");
    }
    // A goal blocking one that already blocks it is a deadlock, not a plan.
    if (request.linkType() == GoalLinkType.BLOCKS
        && linkRepository.existsBySourceGoalIdAndTargetGoalIdAndLinkType(targetId, goalId, GoalLinkType.BLOCKS)) {
      throw new InvalidRequestException("That goal already blocks this one - they'd block each other");
    }
    linkRepository.save(
        GoalLink.builder().userId(userId).sourceGoalId(goalId).targetGoalId(targetId).linkType(request.linkType()).build());
  }

  public void deleteLink(UUID userId, UUID goalId, UUID linkId) {
    owned(userId, goalId);
    GoalLink link =
        linkRepository.findByIdAndUserId(linkId, userId).orElseThrow(() -> ResourceNotFoundException.of("Goal link", linkId));
    if (!goalId.equals(link.getSourceGoalId()) && !goalId.equals(link.getTargetGoalId())) {
      throw ResourceNotFoundException.of("Goal link", linkId);
    }
    linkRepository.delete(link);
  }

  // ---- reviews ----

  @Transactional(readOnly = true)
  public List<GoalReviewResponse> reviews(UUID goalId) {
    return reviewRepository.findAllByGoalIdOrderByReviewDateDescCreatedAtDesc(goalId).stream()
        .map(this::toResponse)
        .toList();
  }

  /** Records a review with a snapshot of where the goal stands, then pushes the next scheduled
   * review out from the review date - a review done early or late resets the cadence from when it
   * actually happened rather than from when it was due. */
  public GoalReviewResponse submitReview(UUID userId, UUID goalId, SubmitGoalReviewRequest request) {
    Goal goal = owned(userId, goalId);
    LocalDate reviewDate = request.reviewDate() == null ? LocalDate.now() : request.reviewDate();
    if (reviewDate.isAfter(LocalDate.now())) {
      throw new InvalidRequestException("A review can't be dated in the future");
    }
    GoalProgress progress = statusSyncer.sync(userId, goal);

    GoalReview review =
        reviewRepository.save(
            GoalReview.builder()
                .goalId(goalId)
                .userId(userId)
                .reviewDate(reviewDate)
                .progressSummary(blankToNull(request.progressSummary()))
                .blockers(blankToNull(request.blockers()))
                .nextSteps(blankToNull(request.nextSteps()))
                .notes(blankToNull(request.notes()))
                .progressSnapshot(progress.result().overallPct())
                .statusSnapshot(progress.effectiveStatus())
                .build());

    if (goal.getReviewFrequency() != null) {
      LocalDate next = goal.getReviewFrequency().nextAfter(reviewDate);
      goal.setNextReviewDate(next.isBefore(LocalDate.now()) ? goal.getReviewFrequency().nextAfter(LocalDate.now()) : next);
      goalRepository.save(goal);
    }
    return toResponse(review);
  }

  // ---- helpers ----

  private Goal owned(UUID userId, UUID goalId) {
    return goalRepository.findByIdAndUserId(goalId, userId).orElseThrow(() -> ResourceNotFoundException.of("Goal", goalId));
  }

  private GoalMetric ownedMetric(UUID userId, UUID goalId, UUID id) {
    return metricRepository
        .findByIdAndGoalIdAndUserId(id, goalId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Metric", id));
  }

  private void applyMetric(GoalMetric metric, SaveMetricRequest request) {
    metric.setName(request.name().trim());
    metric.setMetricType(request.metricType());
    metric.setUnit(blankToNull(request.unit()));
    metric.setStartValue(request.startValue() == null ? BigDecimal.ZERO : request.startValue());
    metric.setTargetValue(request.targetValue());
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private GoalMilestoneResponse toResponse(GoalMilestone m) {
    return new GoalMilestoneResponse(m.getId(), m.getTitle(), m.getTargetDate(), m.getCompletedAt() != null, m.getCompletedAt());
  }

  private GoalMetricEntryResponse toResponse(GoalMetricEntry e) {
    return new GoalMetricEntryResponse(e.getId(), e.getValue(), e.getNote(), e.getRecordedOn());
  }

  private GoalReviewResponse toResponse(GoalReview r) {
    return new GoalReviewResponse(
        r.getId(),
        r.getReviewDate(),
        r.getProgressSummary(),
        r.getBlockers(),
        r.getNextSteps(),
        r.getNotes(),
        r.getProgressSnapshot(),
        r.getStatusSnapshot());
  }

  private GoalMetricResponse toResponse(GoalMetric metric, int entryLimit) {
    List<GoalMetricEntry> entries = entryRepository.findAllByMetricIdOrderByRecordedOnDescCreatedAtDesc(metric.getId());
    BigDecimal current = entries.isEmpty() ? metric.getStartValue() : entries.get(0).getValue();
    int progressPct =
        (int) Math.round(100 * GoalProgressCalculator.metricFraction(metric.getStartValue(), metric.getTargetValue(), current));
    return new GoalMetricResponse(
        metric.getId(),
        metric.getName(),
        metric.getMetricType(),
        metric.getUnit(),
        metric.getStartValue(),
        metric.getTargetValue(),
        current,
        progressPct,
        entries.stream().limit(entryLimit).map(this::toResponse).toList());
  }
}
