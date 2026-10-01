package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.job_tracker.domains.dto.request.AddWatchedCompanyRequest;
import com.lifeos.job_tracker.domains.entity.DiscoveredJob;
import com.lifeos.job_tracker.domains.entity.DiscoveryPreferences;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.entity.WatchedCompany;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.integration.board.BoardFetchResult;
import com.lifeos.job_tracker.integration.board.FetchedPosting;
import com.lifeos.job_tracker.integration.board.JobBoardSource;
import com.lifeos.job_tracker.repository.DiscoveredJobRepository;
import com.lifeos.job_tracker.repository.DiscoveryPreferencesRepository;
import com.lifeos.job_tracker.repository.WatchedCompanyRepository;
import com.lifeos.job_tracker.service.DiscoveryScorer;
import com.lifeos.job_tracker.service.JobDiscoveryService;
import com.lifeos.job_tracker.service.JobListingService;
import com.lifeos.job_tracker.service.SkillService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobDiscoveryServiceTest {

  @Mock private WatchedCompanyRepository watchedRepo;
  @Mock private DiscoveredJobRepository jobRepo;
  @Mock private DiscoveryPreferencesRepository prefsRepo;
  @Mock private SkillService skillService;
  @Mock private JobListingService jobListingService;
  @Mock private NotificationEventPublisher publisher;
  @Mock private TransactionTemplate tx;
  @Mock private JobBoardSource greenhouse;

  private final UUID userId = UUID.randomUUID();
  private WatchedCompany company;
  private JobDiscoveryService service;
  private final List<DiscoveredJob> stored = new ArrayList<>();

  private static final String DESC =
      "Build backend services in Java and Kafka with Spring Boot; own features end to end with a small team.";

  @BeforeEach
  @SuppressWarnings("unchecked")
  void setUp() {
    company =
        WatchedCompany.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .name("Acme")
            .board(JobBoard.GREENHOUSE)
            .slug("acme")
            .alert(true)
            .active(true)
            .build();
    when(greenhouse.board()).thenReturn(JobBoard.GREENHOUSE);
    when(watchedRepo.findAllByUserIdAndActiveTrue(userId)).thenReturn(List.of(company));
    when(watchedRepo.findById(company.getId())).thenReturn(Optional.of(company));
    when(prefsRepo.findById(userId)).thenReturn(Optional.empty());
    when(skillService.list(userId))
        .thenReturn(
            List.of(
                skill("Java"), skill("Kafka"), skill("Spring Boot")));
    when(jobRepo.findAllByWatchedCompanyId(company.getId())).thenAnswer(i -> new ArrayList<>(stored));
    when(jobRepo.saveAll(any()))
        .thenAnswer(
            i -> {
              Iterable<DiscoveredJob> jobs = i.getArgument(0);
              jobs.forEach(j -> { if (!stored.contains(j)) stored.add(j); });
              return List.copyOf(stored);
            });
    org.mockito.Mockito.doAnswer(
            i -> {
              ((java.util.function.Consumer<org.springframework.transaction.TransactionStatus>) i.getArgument(0)).accept(null);
              return null;
            })
        .when(tx)
        .executeWithoutResult(any());
    when(tx.execute(any()))
        .thenAnswer(i -> ((TransactionCallback<Object>) i.getArgument(0)).doInTransaction(null));

    service =
        new JobDiscoveryService(
            watchedRepo, jobRepo, prefsRepo, skillService, new DiscoveryScorer(), jobListingService, publisher, tx, List.of(greenhouse));
  }

  private static Skill skill(String name) {
    return Skill.builder().name(name).yearsOfExperience(BigDecimal.valueOf(3)).build();
  }

  private static FetchedPosting posting(String id, String title) {
    return new FetchedPosting(id, title, "https://boards.example/" + id, "Remote", DESC, Instant.now());
  }

  private void board(boolean complete, FetchedPosting... postings) {
    when(greenhouse.fetch("acme")).thenReturn(new BoardFetchResult(List.of(postings), complete));
  }

  @Test
  void firstScanIsABaselineAndNeverNotifies() {
    board(true, posting("1", "Backend Engineer"), posting("2", "Platform Engineer"));

    var summary = service.scanUser(userId, true);

    assertThat(summary.newOpenings()).isEqualTo(2);
    assertThat(company.getBaselinedAt()).isNotNull();
    assertThat(stored).allMatch(DiscoveredJob::isAlerted);
    verify(publisher, never()).publish(any(), any(), any(), any(), any());
  }

  @Test
  void aNewPostingAfterTheBaselineNotifiesOncePerScan() {
    board(true, posting("1", "Backend Engineer"));
    service.scanUser(userId, true);

    board(true, posting("1", "Backend Engineer"), posting("2", "Platform Engineer"), posting("3", "Data Engineer"));
    var summary = service.scanUser(userId, true);

    assertThat(summary.newOpenings()).isEqualTo(2);
    verify(publisher).publish(eq(userId), eq(NotificationEventType.JOB_NEW_OPENINGS), any(), any(), any());
  }

  @Test
  void aUserTriggeredScanDoesNotNotify() {
    board(true, posting("1", "Backend Engineer"));
    service.scanUser(userId, false);
    board(true, posting("1", "Backend Engineer"), posting("2", "Platform Engineer"));

    service.scanUser(userId, false);

    verify(publisher, never()).publish(any(), any(), any(), any(), any());
  }

  @Test
  void aPostingMissingFromACompleteReadIsClosed() {
    board(true, posting("1", "Backend Engineer"), posting("2", "Platform Engineer"));
    service.scanUser(userId, false);
    DiscoveredJob gone = stored.stream().filter(j -> j.getExternalId().endsWith(":2")).findFirst().orElseThrow();
    when(jobRepo.findUnseenSince(eq(company.getId()), any())).thenReturn(List.of(gone));

    board(true, posting("1", "Backend Engineer"));
    var summary = service.scanUser(userId, false);

    assertThat(summary.closedOpenings()).isEqualTo(1);
    assertThat(gone.getClosedAt()).isNotNull();
  }

  @Test
  void aPartialReadNeverClosesAnything() {
    board(true, posting("1", "Backend Engineer"));
    service.scanUser(userId, false);

    org.mockito.Mockito.clearInvocations(jobRepo);
    board(false, posting("1", "Backend Engineer"));
    var summary = service.scanUser(userId, false);

    assertThat(summary.closedOpenings()).isZero();
    verify(jobRepo, never()).findUnseenSince(any(), any());
  }

  @Test
  void aFailedFetchClosesNothingAndRecordsTheError() {
    when(greenhouse.fetch("acme")).thenThrow(new IllegalStateException("connection reset"));

    var summary = service.scanUser(userId, true);

    assertThat(summary.errors()).singleElement().asString().contains("connection reset");
    assertThat(company.getLastFetchError()).contains("connection reset");
    verify(jobRepo, never()).findUnseenSince(any(), any());
    verify(jobRepo, never()).saveAll(any());
  }

  @Test
  void aClosedPostingThatReappearsIsReopenedNotDuplicated() {
    board(true, posting("1", "Backend Engineer"));
    service.scanUser(userId, false);
    stored.get(0).setClosedAt(Instant.now());

    service.scanUser(userId, false);

    assertThat(stored).hasSize(1);
    assertThat(stored.get(0).getClosedAt()).isNull();
  }

  @Test
  void filteredTitlesAreNeverStored() {
    DiscoveryPreferences prefs = DiscoveryPreferences.defaults(userId);
    prefs.setTitleInclude(List.of("engineer"));
    when(prefsRepo.findById(userId)).thenReturn(Optional.of(prefs));
    board(true, posting("1", "Backend Engineer"), posting("2", "Office Manager"));

    service.scanUser(userId, false);

    assertThat(stored).extracting(DiscoveredJob::getTitle).containsExactly("Backend Engineer");
  }

  @Test
  void duplicateBoardIdsInOneFetchAreCollapsed() {
    board(true, posting("1", "Backend Engineer"), posting("1", "Backend Engineer"));

    service.scanUser(userId, false);

    assertThat(stored).hasSize(1);
  }

  @Test
  void addingACompanyValidatesTheSlug() {
    org.mockito.Mockito.doThrow(new InvalidRequestException("bad slug")).when(greenhouse).validateSlug("../evil");

    assertThatThrownBy(
            () -> service.addCompany(userId, new AddWatchedCompanyRequest("Evil", JobBoard.GREENHOUSE, "../evil", null, true)))
        .isInstanceOf(InvalidRequestException.class);
    verify(watchedRepo, never()).save(any());
  }
}
