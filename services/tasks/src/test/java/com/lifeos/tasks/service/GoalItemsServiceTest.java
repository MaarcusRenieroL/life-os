package com.lifeos.tasks.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.tasks.domains.dto.request.CreateGoalLinkRequest;
import com.lifeos.tasks.domains.dto.request.LogMetricEntryRequest;
import com.lifeos.tasks.domains.dto.request.SaveMetricRequest;
import com.lifeos.tasks.domains.dto.request.SaveMilestoneRequest;
import com.lifeos.tasks.domains.dto.request.SubmitGoalReviewRequest;
import com.lifeos.tasks.domains.dto.response.GoalLinkResponse;
import com.lifeos.tasks.domains.dto.response.GoalMetricResponse;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.GoalLink;
import com.lifeos.tasks.domains.entity.GoalMetric;
import com.lifeos.tasks.domains.entity.GoalMetricEntry;
import com.lifeos.tasks.domains.entity.GoalMilestone;
import com.lifeos.tasks.domains.enums.GoalLinkType;
import com.lifeos.tasks.domains.enums.GoalMetricType;
import com.lifeos.tasks.domains.enums.GoalReviewFrequency;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalLinkRepository;
import com.lifeos.tasks.repository.GoalMetricEntryRepository;
import com.lifeos.tasks.repository.GoalMetricRepository;
import com.lifeos.tasks.repository.GoalMilestoneRepository;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.repository.GoalReviewRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GoalItemsServiceTest {

  @Mock private GoalRepository goalRepository;
  @Mock private GoalMilestoneRepository milestoneRepository;
  @Mock private GoalMetricRepository metricRepository;
  @Mock private GoalMetricEntryRepository entryRepository;
  @Mock private GoalLinkRepository linkRepository;
  @Mock private GoalReviewRepository reviewRepository;
  @Mock private GoalStatusSyncer statusSyncer;

  private GoalItemsService service;

  private final UUID userId = UUID.randomUUID();
  private Goal goal;

  @BeforeEach
  void setUp() {
    service =
        new GoalItemsService(
            goalRepository, milestoneRepository, metricRepository, entryRepository, linkRepository, reviewRepository, statusSyncer);
    goal = Goal.builder().id(UUID.randomUUID()).userId(userId).name("G").status(GoalStatus.ACTIVE).build();
    when(goalRepository.findByIdAndUserId(goal.getId(), userId)).thenReturn(Optional.of(goal));
    when(goalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(milestoneRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(metricRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(reviewRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(statusSyncer.sync(eq(userId), any())).thenAnswer(inv -> progress(42, GoalStatus.ON_TRACK));
  }

  private GoalProgressAssembler.GoalProgress progress(int overall, GoalStatus status) {
    return new GoalProgressAssembler.GoalProgress(
        new GoalProgressCalculator.Result(overall, null, null, null, null, null), status, 0, 0, 0, 0, 0, 0);
  }

  // ---- milestones ----

  @Test
  void addingACompletedMilestoneStampsItAndResyncsTheGoal() {
    var response = service.addMilestone(userId, goal.getId(), new SaveMilestoneRequest(" Halfway ", null, true));

    assertThat(response.title()).isEqualTo("Halfway");
    assertThat(response.completed()).isTrue();
    verify(statusSyncer).sync(userId, goal);
  }

  @Test
  void reTickingACompleteMilestoneKeepsItsOriginalCompletionTime() {
    Instant original = Instant.parse("2026-01-01T00:00:00Z");
    GoalMilestone milestone = GoalMilestone.builder().id(UUID.randomUUID()).goalId(goal.getId()).userId(userId).title("M").completedAt(original).build();
    when(milestoneRepository.findByIdAndGoalIdAndUserId(milestone.getId(), goal.getId(), userId)).thenReturn(Optional.of(milestone));

    var response = service.updateMilestone(userId, goal.getId(), milestone.getId(), new SaveMilestoneRequest("M", null, true));
    assertThat(response.completedAt()).isEqualTo(original);

    var untick = service.updateMilestone(userId, goal.getId(), milestone.getId(), new SaveMilestoneRequest("M", null, false));
    assertThat(untick.completed()).isFalse();
  }

  @Test
  void aPlainMilestoneEditLeavesItsCompletionAlone() {
    GoalMilestone milestone =
        GoalMilestone.builder().id(UUID.randomUUID()).goalId(goal.getId()).userId(userId).title("M").completedAt(Instant.now()).build();
    when(milestoneRepository.findByIdAndGoalIdAndUserId(milestone.getId(), goal.getId(), userId)).thenReturn(Optional.of(milestone));

    var response = service.updateMilestone(userId, goal.getId(), milestone.getId(), new SaveMilestoneRequest("Renamed", null, null));

    assertThat(response.title()).isEqualTo("Renamed");
    assertThat(response.completed()).isTrue();
  }

  @Test
  void milestoneOfAnotherGoalIsNotFound() {
    UUID id = UUID.randomUUID();
    when(milestoneRepository.findByIdAndGoalIdAndUserId(id, goal.getId(), userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.deleteMilestone(userId, goal.getId(), id)).isInstanceOf(ResourceNotFoundException.class);
  }

  // ---- metrics ----

  private GoalMetric metric(String start, String target) {
    GoalMetric metric =
        GoalMetric.builder()
            .id(UUID.randomUUID())
            .goalId(goal.getId())
            .userId(userId)
            .name("Weight")
            .metricType(GoalMetricType.WEIGHT)
            .startValue(new BigDecimal(start))
            .targetValue(new BigDecimal(target))
            .build();
    when(metricRepository.findByIdAndGoalIdAndUserId(metric.getId(), goal.getId(), userId)).thenReturn(Optional.of(metric));
    return metric;
  }

  @Test
  void aMetricWithNoEntriesSitsAtItsStartValue() {
    GoalMetric metric = metric("90", "80");
    when(entryRepository.findAllByMetricIdOrderByRecordedOnDescCreatedAtDesc(metric.getId())).thenReturn(List.of());

    GoalMetricResponse response = service.updateMetric(userId, goal.getId(), metric.getId(), new SaveMetricRequest("Weight", GoalMetricType.WEIGHT, "kg", new BigDecimal("90"), new BigDecimal("80")));

    assertThat(response.currentValue()).isEqualByComparingTo("90");
    assertThat(response.progressPct()).isZero();
  }

  @Test
  void loggingAnEntryMovesTheCurrentValueAndProgress() {
    GoalMetric metric = metric("90", "80");
    GoalMetricEntry latest = GoalMetricEntry.builder().id(UUID.randomUUID()).metricId(metric.getId()).value(new BigDecimal("85")).recordedOn(LocalDate.now()).build();
    when(entryRepository.findAllByMetricIdOrderByRecordedOnDescCreatedAtDesc(metric.getId())).thenReturn(List.of(latest));

    GoalMetricResponse response = service.logEntry(userId, goal.getId(), metric.getId(), new LogMetricEntryRequest(new BigDecimal("85"), "  ", null));

    assertThat(response.currentValue()).isEqualByComparingTo("85");
    assertThat(response.progressPct()).isEqualTo(50);
    verify(entryRepository).save(any(GoalMetricEntry.class));
    verify(statusSyncer).sync(userId, goal);
  }

  @Test
  void entriesCannotBeDatedInTheFuture() {
    GoalMetric metric = metric("0", "10");

    assertThatThrownBy(() -> service.logEntry(userId, goal.getId(), metric.getId(), new LogMetricEntryRequest(BigDecimal.ONE, null, LocalDate.now().plusDays(1))))
        .isInstanceOf(InvalidRequestException.class);
    verify(entryRepository, never()).save(any());
  }

  // ---- links ----

  private Goal otherGoal() {
    Goal other = Goal.builder().id(UUID.randomUUID()).userId(userId).name("Other").status(GoalStatus.ACTIVE).build();
    when(goalRepository.findByIdAndUserId(other.getId(), userId)).thenReturn(Optional.of(other));
    return other;
  }

  @Test
  void aGoalCannotLinkToItself() {
    assertThatThrownBy(() -> service.addLink(userId, goal.getId(), new CreateGoalLinkRequest(goal.getId(), GoalLinkType.SUPPORTS)))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void duplicateLinksAreRejected() {
    Goal other = otherGoal();
    when(linkRepository.existsBySourceGoalIdAndTargetGoalIdAndLinkType(goal.getId(), other.getId(), GoalLinkType.SUPPORTS)).thenReturn(true);

    assertThatThrownBy(() -> service.addLink(userId, goal.getId(), new CreateGoalLinkRequest(other.getId(), GoalLinkType.SUPPORTS)))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void mutualBlockingIsRejected() {
    Goal other = otherGoal();
    when(linkRepository.existsBySourceGoalIdAndTargetGoalIdAndLinkType(other.getId(), goal.getId(), GoalLinkType.BLOCKS)).thenReturn(true);

    assertThatThrownBy(() -> service.addLink(userId, goal.getId(), new CreateGoalLinkRequest(other.getId(), GoalLinkType.BLOCKS)))
        .isInstanceOf(InvalidRequestException.class)
        .hasMessageContaining("block each other");
  }

  @Test
  void linkingToAnotherUsersGoalIsNotFound() {
    UUID foreign = UUID.randomUUID();
    when(goalRepository.findByIdAndUserId(foreign, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.addLink(userId, goal.getId(), new CreateGoalLinkRequest(foreign, GoalLinkType.BLOCKS)))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void linksResolveAgainstTheGoalBeingViewed() {
    Goal other = Goal.builder().id(UUID.randomUUID()).userId(userId).name("Other").status(GoalStatus.PAUSED).build();
    GoalLink outgoing = GoalLink.builder().id(UUID.randomUUID()).sourceGoalId(goal.getId()).targetGoalId(other.getId()).linkType(GoalLinkType.BLOCKS).build();
    GoalLink incoming = GoalLink.builder().id(UUID.randomUUID()).sourceGoalId(other.getId()).targetGoalId(goal.getId()).linkType(GoalLinkType.SUPPORTS).build();
    GoalLink unrelated = GoalLink.builder().id(UUID.randomUUID()).sourceGoalId(UUID.randomUUID()).targetGoalId(UUID.randomUUID()).linkType(GoalLinkType.BLOCKS).build();

    List<GoalLinkResponse> links =
        service.linksFor(goal.getId(), List.of(outgoing, incoming, unrelated), Map.of(goal.getId(), goal, other.getId(), other), Map.of());

    assertThat(links).extracting(GoalLinkResponse::relation).containsExactly("BLOCKS", "SUPPORTED_BY");
    assertThat(links).extracting(GoalLinkResponse::otherGoalName).containsOnly("Other");
  }

  // ---- reviews ----

  @Test
  void reviewSnapshotsProgressAndPushesTheNextReviewOutFromTheReviewDate() {
    goal.setReviewFrequency(GoalReviewFrequency.BIWEEKLY);
    goal.setNextReviewDate(LocalDate.now().minusDays(1));

    var review = service.submitReview(userId, goal.getId(), new SubmitGoalReviewRequest("  going well ", " ", null, null, null));

    assertThat(review.progressSummary()).isEqualTo("going well");
    assertThat(review.blockers()).isNull();
    assertThat(review.progressSnapshot()).isEqualTo(42);
    assertThat(review.statusSnapshot()).isEqualTo(GoalStatus.ON_TRACK);
    assertThat(goal.getNextReviewDate()).isEqualTo(LocalDate.now().plusWeeks(2));
  }

  @Test
  void aBackdatedReviewNeverSchedulesTheNextOneInThePast() {
    goal.setReviewFrequency(GoalReviewFrequency.BIWEEKLY);

    service.submitReview(userId, goal.getId(), new SubmitGoalReviewRequest(null, null, null, null, LocalDate.now().minusMonths(2)));

    assertThat(goal.getNextReviewDate()).isAfter(LocalDate.now());
  }

  @Test
  void reviewWithoutCadenceLeavesNoNextReview() {
    service.submitReview(userId, goal.getId(), new SubmitGoalReviewRequest("x", null, null, null, null));

    assertThat(goal.getNextReviewDate()).isNull();
  }

  @Test
  void reviewsCannotBeDatedInTheFuture() {
    assertThatThrownBy(() -> service.submitReview(userId, goal.getId(), new SubmitGoalReviewRequest("x", null, null, null, LocalDate.now().plusDays(1))))
        .isInstanceOf(InvalidRequestException.class);
  }
}
