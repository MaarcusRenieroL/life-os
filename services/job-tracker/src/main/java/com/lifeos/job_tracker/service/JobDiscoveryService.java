package com.lifeos.job_tracker.service;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.job_tracker.domains.dto.request.AddWatchedCompanyRequest;
import com.lifeos.job_tracker.domains.dto.request.DiscoveryPreferencesRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateWatchedCompanyRequest;
import com.lifeos.job_tracker.domains.dto.response.DiscoveryScanResponse;
import com.lifeos.job_tracker.domains.entity.DiscoveredJob;
import com.lifeos.job_tracker.domains.entity.DiscoveryPreferences;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.WatchedCompany;
import com.lifeos.job_tracker.domains.enums.DiscoveredJobStatus;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import com.lifeos.job_tracker.exception.DuplicateResourceException;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.board.BoardFetchResult;
import com.lifeos.job_tracker.integration.board.FetchedPosting;
import com.lifeos.job_tracker.integration.board.JobBoardSource;
import com.lifeos.job_tracker.repository.DiscoveredJobRepository;
import com.lifeos.job_tracker.repository.DiscoveryPreferencesRepository;
import com.lifeos.job_tracker.repository.WatchedCompanyRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Watches company career boards and turns each scan into a diff: what opened, what closed. New
 * openings are scored for free against the candidate's skill library and held in an inbox until
 * promoted into the real pipeline.
 *
 * <p>Three rules keep the diff trustworthy:
 *
 * <ul>
 *   <li><b>A failed or partial read closes nothing.</b> Postings are only marked closed when the
 *       board fetched successfully <i>and</i> completely; otherwise one network blip, or a board
 *       larger than the page cap, would report the whole company as closed.
 *   <li><b>The first scan of a company is a baseline.</b> Its whole board looks new, so none of it
 *       raises a notification; alerts start from the next genuinely new posting.
 *   <li><b>Identity is the board's own id</b>, not title+URL, so an edited posting is the same
 *       posting and a closed one that reappears reopens instead of duplicating.
 * </ul>
 */
@Service
public class JobDiscoveryService {

  private static final Logger log = LoggerFactory.getLogger(JobDiscoveryService.class);
  private static final int INBOX_LIMIT = 500;
  private static final int MAX_WATCHED_COMPANIES = 200;

  private final WatchedCompanyRepository watchedCompanyRepository;
  private final DiscoveredJobRepository discoveredJobRepository;
  private final DiscoveryPreferencesRepository preferencesRepository;
  private final SkillService skillService;
  private final DiscoveryScorer scorer;
  private final JobListingService jobListingService;
  private final NotificationEventPublisher notificationEventPublisher;
  private final TransactionTemplate transactionTemplate;
  private final Map<JobBoard, JobBoardSource> sources = new EnumMap<>(JobBoard.class);

  /** Users with a scan in flight, so a manual scan and the daily one cannot race on inserts. */
  private final Set<UUID> scanning = ConcurrentHashMap.newKeySet();

  private final ExecutorService background = Executors.newSingleThreadExecutor();

  public JobDiscoveryService(
      WatchedCompanyRepository watchedCompanyRepository,
      DiscoveredJobRepository discoveredJobRepository,
      DiscoveryPreferencesRepository preferencesRepository,
      SkillService skillService,
      DiscoveryScorer scorer,
      JobListingService jobListingService,
      NotificationEventPublisher notificationEventPublisher,
      TransactionTemplate transactionTemplate,
      List<JobBoardSource> boardSources) {
    this.watchedCompanyRepository = watchedCompanyRepository;
    this.discoveredJobRepository = discoveredJobRepository;
    this.preferencesRepository = preferencesRepository;
    this.skillService = skillService;
    this.scorer = scorer;
    this.jobListingService = jobListingService;
    this.notificationEventPublisher = notificationEventPublisher;
    this.transactionTemplate = transactionTemplate;
    boardSources.forEach(source -> sources.put(source.board(), source));
  }

  // -- watchlist ---------------------------------------------------------

  @Transactional(readOnly = true)
  public List<WatchedCompany> listCompanies(UUID userId) {
    return watchedCompanyRepository.findAllByUserIdOrderByNameAsc(userId);
  }

  @Transactional
  public WatchedCompany addCompany(UUID userId, AddWatchedCompanyRequest request) {
    String name = request.name().trim();
    if (watchedCompanyRepository.existsByUserIdAndNameIgnoreCase(userId, name)) {
      throw new DuplicateResourceException("You already watch " + name);
    }
    if (watchedCompanyRepository.findAllByUserIdOrderByNameAsc(userId).size() >= MAX_WATCHED_COMPANIES) {
      throw new InvalidRequestException("Watchlist is limited to " + MAX_WATCHED_COMPANIES + " companies");
    }
    sourceFor(request.board()).validateSlug(request.slug());

    return watchedCompanyRepository.save(
        WatchedCompany.builder()
            .userId(userId)
            .name(name)
            .board(request.board())
            .slug(request.slug().trim())
            .domain(request.domain() == null || request.domain().isBlank() ? null : request.domain().trim())
            .alert(request.alert() == null || request.alert())
            .active(true)
            .build());
  }

  @Transactional
  public WatchedCompany updateCompany(UUID userId, UUID id, UpdateWatchedCompanyRequest request) {
    WatchedCompany company = getCompany(userId, id);
    if (request.active() != null) {
      company.setActive(request.active());
    }
    if (request.alert() != null) {
      company.setAlert(request.alert());
    }
    return watchedCompanyRepository.save(company);
  }

  @Transactional
  public void deleteCompany(UUID userId, UUID id) {
    watchedCompanyRepository.delete(getCompany(userId, id));
  }

  private WatchedCompany getCompany(UUID userId, UUID id) {
    return watchedCompanyRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Watched company", id));
  }

  // -- preferences -------------------------------------------------------

  @Transactional(readOnly = true)
  public DiscoveryPreferences getPreferences(UUID userId) {
    return preferencesRepository.findById(userId).orElseGet(() -> DiscoveryPreferences.defaults(userId));
  }

  @Transactional
  public DiscoveryPreferences savePreferences(UUID userId, DiscoveryPreferencesRequest request) {
    DiscoveryPreferences prefs =
        preferencesRepository.findById(userId).orElseGet(() -> DiscoveryPreferences.defaults(userId));
    prefs.setTitleInclude(cleaned(request.titleInclude()));
    prefs.setTitleExclude(cleaned(request.titleExclude()));
    prefs.setLocations(cleaned(request.locations()));
    prefs.setMaxSeniority(request.maxSeniority());
    if (request.alertMinScore() != null) {
      if (request.alertMinScore() < 0 || request.alertMinScore() > 100) {
        throw new InvalidRequestException("alertMinScore must be between 0 and 100");
      }
      prefs.setAlertMinScore(request.alertMinScore());
    }
    return preferencesRepository.save(prefs);
  }

  private static List<String> cleaned(List<String> values) {
    if (values == null) {
      return new ArrayList<>();
    }
    return values.stream().map(String::trim).filter(v -> !v.isEmpty()).distinct().limit(50).toList();
  }

  // -- inbox -------------------------------------------------------------

  @Transactional(readOnly = true)
  public List<DiscoveredJob> inbox(UUID userId, Integer minScore, UUID companyId, int limit) {
    return discoveredJobRepository.inbox(
        userId, DiscoveredJobStatus.NEW, minScore, companyId, PageRequest.of(0, Math.min(Math.max(limit, 1), INBOX_LIMIT)));
  }

  @Transactional(readOnly = true)
  public DiscoveredJob getJob(UUID userId, UUID id) {
    return discoveredJobRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Discovered job", id));
  }

  @Transactional
  public DiscoveredJob dismiss(UUID userId, UUID id) {
    DiscoveredJob job = getJob(userId, id);
    if (job.getStatus() == DiscoveredJobStatus.PROMOTED) {
      throw new InvalidRequestException("This opening is already tracked as a job");
    }
    job.setStatus(DiscoveredJobStatus.DISMISSED);
    return discoveredJobRepository.save(job);
  }

  /** Copies an inbox opening into the real pipeline as an INTERESTED job. Idempotent. */
  @Transactional
  public JobListing promote(UUID userId, UUID id) {
    DiscoveredJob discovered = getJob(userId, id);
    if (discovered.getStatus() == DiscoveredJobStatus.PROMOTED && discovered.getPromotedJobId() != null) {
      return jobListingService.get(userId, discovered.getPromotedJobId());
    }
    JobListing job = jobListingService.createFromDiscovery(userId, discovered);
    discovered.setStatus(DiscoveredJobStatus.PROMOTED);
    discovered.setPromotedJobId(job.getId());
    discoveredJobRepository.save(discovered);
    return job;
  }

  // -- scanning ----------------------------------------------------------

  /** Kicks off a scan of every active company on a background thread and returns immediately. */
  public boolean scanInBackground(UUID userId) {
    if (scanning.contains(userId)) {
      return false;
    }
    background.submit(
        () -> {
          try {
            scanUser(userId, false);
          } catch (RuntimeException exception) {
            log.warn("background discovery scan failed for user {}: {}", userId, exception.getMessage());
          }
        });
    return true;
  }

  /**
   * Scans every active watched company for one user.
   *
   * @param notify raise a single "new openings" notification for high-fit finds. The daily
   *     scheduler passes true; a scan the user just triggered themselves does not, since they are
   *     already looking at the result.
   */
  public DiscoveryScanResponse scanUser(UUID userId, boolean notify) {
    if (!scanning.add(userId)) {
      throw new InvalidRequestException("A scan is already running");
    }
    try {
      List<WatchedCompany> companies = watchedCompanyRepository.findAllByUserIdAndActiveTrue(userId);
      if (companies.isEmpty()) {
        return new DiscoveryScanResponse(0, 0, 0, List.of());
      }
      DiscoveryPreferences prefs = getPreferences(userId);
      DiscoveryScorer.Prepared prepared = scorer.prepare(skillService.list(userId), prefs);

      int fresh = 0;
      int closed = 0;
      List<String> errors = new ArrayList<>();
      List<DiscoveredJob> alertable = new ArrayList<>();
      for (WatchedCompany company : companies) {
        CompanyScan result = scanCompany(company, prefs, prepared);
        fresh += result.fresh().size();
        closed += result.closedCount();
        alertable.addAll(result.alertable());
        if (result.error() != null) {
          errors.add(company.getName() + ": " + result.error());
        }
      }
      if (notify && !alertable.isEmpty()) {
        publishNewOpenings(userId, alertable);
      }
      return new DiscoveryScanResponse(companies.size(), fresh, closed, errors);
    } finally {
      scanning.remove(userId);
    }
  }

  /** Scans one company on demand, e.g. right after adding it. */
  public DiscoveryScanResponse scanCompany(UUID userId, UUID companyId) {
    WatchedCompany company = getCompany(userId, companyId);
    DiscoveryPreferences prefs = getPreferences(userId);
    CompanyScan result = scanCompany(company, prefs, scorer.prepare(skillService.list(userId), prefs));
    return new DiscoveryScanResponse(
        1,
        result.fresh().size(),
        result.closedCount(),
        result.error() == null ? List.of() : List.of(company.getName() + ": " + result.error()));
  }

  record CompanyScan(List<DiscoveredJob> fresh, List<DiscoveredJob> alertable, int closedCount, String error) {}

  private CompanyScan scanCompany(
      WatchedCompany company, DiscoveryPreferences prefs, DiscoveryScorer.Prepared prepared) {
    BoardFetchResult fetched;
    try {
      fetched = sourceFor(company.getBoard()).fetch(company.getSlug());
    } catch (RuntimeException exception) {
      String message = describe(exception);
      log.warn("discovery fetch failed for {} ({}): {}", company.getName(), company.getBoard(), message);
      // Nothing is closed and nothing is marked seen: a failed read says nothing about the board.
      transactionTemplate.executeWithoutResult(
          status -> {
            WatchedCompany fresh = watchedCompanyRepository.findById(company.getId()).orElse(null);
            if (fresh != null) {
              fresh.setLastFetchError(message);
              watchedCompanyRepository.save(fresh);
            }
          });
      return new CompanyScan(List.of(), List.of(), 0, message);
    }
    try {
      return transactionTemplate.execute(status -> ingest(company.getId(), fetched, prefs, prepared, Instant.now()));
    } catch (RuntimeException exception) {
      log.warn("discovery ingest failed for {}: {}", company.getName(), exception.getMessage(), exception);
      return new CompanyScan(List.of(), List.of(), 0, "could not save results: " + describe(exception));
    }
  }

  /** The diff. Runs inside one transaction so a company is either fully updated or untouched. */
  CompanyScan ingest(
      UUID watchedCompanyId,
      BoardFetchResult fetched,
      DiscoveryPreferences prefs,
      DiscoveryScorer.Prepared prepared,
      Instant now) {
    WatchedCompany company = watchedCompanyRepository.findById(watchedCompanyId).orElseThrow();
    boolean baseline = company.getBaselinedAt() == null;

    Map<String, DiscoveredJob> existing = new HashMap<>();
    for (DiscoveredJob job : discoveredJobRepository.findAllByWatchedCompanyId(company.getId())) {
      existing.put(job.getExternalId(), job);
    }

    List<DiscoveredJob> toSave = new ArrayList<>();
    List<DiscoveredJob> fresh = new ArrayList<>();
    Set<String> seenThisRun = new HashSet<>();
    for (FetchedPosting posting : fetched.postings()) {
      if (!prepared.passesFilters(posting.title())) {
        continue;
      }
      String externalId = company.getBoard().name().toLowerCase() + ":" + company.getSlug() + ":" + posting.boardId();
      if (!seenThisRun.add(externalId)) {
        continue;
      }
      DiscoveredJob job = existing.get(externalId);
      if (job != null) {
        job.setLastSeenAt(now);
        job.setClosedAt(null); // reappeared: reopen rather than duplicate
        job.setTitle(posting.title());
        job.setUrl(posting.url());
        job.setLocation(posting.location());
        if ((job.getDescription() == null || job.getDescription().isBlank()) && !posting.description().isBlank()) {
          job.setDescription(posting.description());
          applyScore(job, prepared);
        }
        toSave.add(job);
        continue;
      }
      DiscoveredJob created =
          DiscoveredJob.builder()
              .userId(company.getUserId())
              .watchedCompanyId(company.getId())
              .externalId(externalId)
              .company(company.getName())
              .title(posting.title())
              .url(posting.url())
              .location(posting.location())
              .description(posting.description())
              .postedAt(posting.postedAt())
              .firstSeenAt(now)
              .lastSeenAt(now)
              .status(DiscoveredJobStatus.NEW)
              // A baseline scan records history silently; it must not look like news.
              .alerted(baseline)
              .build();
      applyScore(created, prepared);
      toSave.add(created);
      fresh.add(created);
    }
    discoveredJobRepository.saveAll(toSave);

    int closedCount = 0;
    if (fetched.complete()) {
      List<DiscoveredJob> gone = discoveredJobRepository.findUnseenSince(company.getId(), now);
      gone.forEach(job -> job.setClosedAt(now));
      discoveredJobRepository.saveAll(gone);
      closedCount = gone.size();
    }

    company.setLastFetchedAt(now);
    company.setLastFetchError(null);
    company.setLastOpenCount(fetched.postings().size());
    if (baseline) {
      company.setBaselinedAt(now);
    }
    watchedCompanyRepository.save(company);

    List<DiscoveredJob> alertable =
        baseline || !company.isAlert()
            ? List.of()
            : fresh.stream()
                .filter(job -> job.getFitScore() != null && job.getFitScore() >= prefs.getAlertMinScore())
                .toList();
    return new CompanyScan(fresh, alertable, closedCount, null);
  }

  private static void applyScore(DiscoveredJob job, DiscoveryScorer.Prepared prepared) {
    DiscoveryScorer.Result result = prepared.score(job.getTitle(), job.getLocation(), job.getDescription());
    job.setFitScore(result.score());
    job.setFitExplanation(result.explanation());
  }

  private void publishNewOpenings(UUID userId, List<DiscoveredJob> alertable) {
    List<DiscoveredJob> best =
        alertable.stream()
            .sorted((a, b) -> Integer.compare(b.getFitScore(), a.getFitScore()))
            .limit(3)
            .toList();
    StringBuilder body = new StringBuilder();
    for (DiscoveredJob job : best) {
      if (!body.isEmpty()) {
        body.append("; ");
      }
      body.append(job.getTitle()).append(" at ").append(job.getCompany()).append(" (").append(job.getFitScore()).append(")");
    }
    if (alertable.size() > best.size()) {
      body.append("; +").append(alertable.size() - best.size()).append(" more");
    }
    String title =
        alertable.size() == 1
            ? "New opening at " + best.get(0).getCompany()
            : alertable.size() + " new openings at companies you watch";
    notificationEventPublisher.publish(
        userId,
        NotificationEventType.JOB_NEW_OPENINGS,
        title,
        body.toString(),
        Map.of("count", String.valueOf(alertable.size())));
  }

  private JobBoardSource sourceFor(JobBoard board) {
    JobBoardSource source = sources.get(board);
    if (source == null) {
      throw new InvalidRequestException("Unsupported job board: " + board);
    }
    return source;
  }

  private static String describe(Throwable exception) {
    Throwable root = exception;
    while (root.getCause() != null && root.getCause() != root) {
      root = root.getCause();
    }
    String message = root.getMessage() == null ? root.getClass().getSimpleName() : root.getMessage();
    return message.length() > 300 ? message.substring(0, 300) : message;
  }
}
