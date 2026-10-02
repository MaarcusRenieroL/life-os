package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.record.AppliedJobImport;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Bulk-adds applications made elsewhere (Naukri, Indeed, ...). The candidate copies the text of the
 * board's "Applied jobs" page and pastes it; the model only structures it, and nothing is saved
 * until the candidate confirms the preview. No credentials, no browser automation.
 */
@Service
@RequiredArgsConstructor
public class AppliedJobsImportService {

  private static final Logger log = LoggerFactory.getLogger(AppliedJobsImportService.class);

  /** Small enough for a local model to keep every entry straight, large enough to be few calls. */
  public static final int CHUNK_CHARS = 5_000;
  public static final int MAX_CHARS = 120_000;
  /** One confirm saves at most this many rows, so an oversized request cannot flood the table. */
  public static final int MAX_IMPORT_ITEMS = 500;

  private final AiAssistant ai;
  private final JobListingRepository jobListingRepository;
  private final JobListingService jobListingService;

  public List<AppliedJobImport.Candidate> preview(UUID userId, String text) {
    if (text == null || text.isBlank()) {
      throw new InvalidRequestException("Paste the text of your Applied jobs page first.");
    }
    if (text.length() > MAX_CHARS) {
      throw new InvalidRequestException("That is too much text - paste one page of applications at a time.");
    }
    if (!ai.available()) {
      throw new InvalidRequestException("Reading pasted text needs an AI provider; enable Ollama or set ANTHROPIC_API_KEY.");
    }

    List<AppliedJobImport.Item> found = new ArrayList<>();
    int failures = 0;
    List<String> chunks = chunk(text);
    for (String chunk : chunks) {
      try {
        AppliedJobImport.Parsed parsed = ai.parseAppliedJobs(chunk);
        if (parsed != null && parsed.jobs() != null) {
          found.addAll(parsed.jobs());
        }
      } catch (RuntimeException exception) {
        failures++;
        log.warn("Reading an applied-jobs chunk failed: {}", exception.getMessage());
      }
    }
    if (found.isEmpty() && failures > 0) {
      throw new InvalidRequestException("Couldn't read any applications from that text. Try pasting fewer at a time.");
    }

    Set<String> tracked = trackedKeys(userId);
    Set<String> seen = new HashSet<>();
    List<AppliedJobImport.Candidate> out = new ArrayList<>();
    for (AppliedJobImport.Item item : found) {
      if (isBlank(item.title()) || isBlank(item.company())) {
        continue;
      }
      String key = key(item.company(), item.title());
      if (!seen.add(key)) {
        continue; // the same entry twice in one paste (a chunk boundary, or a repeated row)
      }
      out.add(
          new AppliedJobImport.Candidate(
              item.title().trim(), item.company().trim(), clean(item.location()), isoOrNull(item.appliedOn()), tracked.contains(key)));
    }
    return out;
  }

  public AppliedJobImport.Result importJobs(UUID userId, String source, List<AppliedJobImport.Item> items) {
    if (items == null || items.isEmpty()) {
      throw new InvalidRequestException("Nothing to import.");
    }
    if (items.size() > MAX_IMPORT_ITEMS) {
      throw new InvalidRequestException("Import at most " + MAX_IMPORT_ITEMS + " applications at a time.");
    }
    String label = isBlank(source) ? "import" : cut(source.trim().toLowerCase(Locale.ROOT), 50);
    Set<String> known = trackedKeys(userId);
    int created = 0;
    int skipped = 0;
    for (AppliedJobImport.Item item : items) {
      if (item == null || isBlank(item.title()) || isBlank(item.company()) || !known.add(key(item.company(), item.title()))) {
        skipped++;
        continue;
      }
      LocalDate appliedOn = null;
      String iso = isoOrNull(item.appliedOn());
      if (iso != null) {
        appliedOn = LocalDate.parse(iso);
      }
      jobListingService.createApplied(userId, cut(item.company().trim(), 300), cut(item.title().trim(), 500), cut(clean(item.location()), 300), appliedOn, label);
      created++;
    }
    return new AppliedJobImport.Result(created, skipped);
  }

  private Set<String> trackedKeys(UUID userId) {
    Set<String> keys = new HashSet<>();
    for (JobListing job : jobListingRepository.findAllForUser(userId)) {
      keys.add(key(job.getCompany(), job.getTitle()));
    }
    return keys;
  }

  /** Company + title, case/punctuation-insensitive: the identity of an application. */
  static String key(String company, String title) {
    return normalise(company) + "|" + normalise(title);
  }

  private static String normalise(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
  }

  /** Splits on line boundaries so an entry is never cut in half (unless one line is enormous). */
  public static List<String> chunkForTest(String text) {
    return chunk(text);
  }

  static List<String> chunk(String text) {
    List<String> chunks = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    for (String line : text.split("\\R")) {
      if (current.length() + line.length() + 1 > CHUNK_CHARS && current.length() > 0) {
        chunks.add(current.toString());
        current.setLength(0);
      }
      current.append(line).append('\n');
    }
    if (current.length() > 0) {
      chunks.add(current.toString());
    }
    return chunks;
  }

  private static String isoOrNull(String value) {
    if (isBlank(value)) {
      return null;
    }
    try {
      return LocalDate.parse(value.trim().substring(0, Math.min(10, value.trim().length()))).toString();
    } catch (DateTimeParseException exception) {
      return null;
    }
  }

  /** Fits a value to its column; null stays null. */
  private static String cut(String value, int max) {
    return value == null || value.length() <= max ? value : value.substring(0, max);
  }

  private static String clean(String value) {
    return isBlank(value) || "null".equalsIgnoreCase(value.trim()) ? null : value.trim();
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
