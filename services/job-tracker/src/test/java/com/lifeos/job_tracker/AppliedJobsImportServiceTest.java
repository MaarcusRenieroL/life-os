package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.record.AppliedJobImport;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.AppliedJobsImportService;
import com.lifeos.job_tracker.service.JobListingService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AppliedJobsImportServiceTest {

  @Mock private AiAssistant ai;
  @Mock private JobListingRepository jobListingRepository;
  @Mock private JobListingService jobListingService;
  @InjectMocks private AppliedJobsImportService service;

  private final UUID userId = UUID.randomUUID();

  private static AppliedJobImport.Item item(String title, String company, String location, String appliedOn) {
    return new AppliedJobImport.Item(title, company, location, appliedOn);
  }

  private static JobListing tracked(String company, String title) {
    return JobListing.builder().company(company).title(title).build();
  }

  @Test
  void previewMarksWhatIsAlreadyTrackedAndDropsRepeatsAndBlankRows() {
    when(ai.available()).thenReturn(true);
    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of(tracked("Demetrius Technologies", "Backend Developer")));
    when(ai.parseAppliedJobs(anyString()))
        .thenReturn(
            new AppliedJobImport.Parsed(
                List.of(
                    item("Backend developer", "Demetrius Technologies", "Pune", "2026-09-30"),
                    item("Python Developer", "Capgemini", "null", "30 Sep"),
                    item("python  developer", "CAPGEMINI", "Mumbai", "2026-09-30"),
                    item("", "Nobody", null, null))));

    List<AppliedJobImport.Candidate> out = service.preview(userId, "Applied jobs\nBackend developer\nDemetrius Technologies");

    assertThat(out).hasSize(2);
    assertThat(out.get(0).duplicate()).isTrue();
    assertThat(out.get(0).appliedOn()).isEqualTo("2026-09-30");
    assertThat(out.get(1).company()).isEqualTo("Capgemini");
    assertThat(out.get(1).duplicate()).isFalse();
    assertThat(out.get(1).location()).isNull();
    assertThat(out.get(1).appliedOn()).isNull();
  }

  @Test
  void longPastesAreSplitOnLineBoundariesAndEveryChunkIsRead() {
    when(ai.available()).thenReturn(true);
    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of());
    when(ai.parseAppliedJobs(anyString())).thenReturn(new AppliedJobImport.Parsed(List.of()));
    String line = "x".repeat(900);
    String text = (line + "\n").repeat(30);

    service.preview(userId, text);

    List<String> chunks = AppliedJobsImportService.chunkForTest(text);
    assertThat(chunks.size()).isGreaterThan(3);
    assertThat(chunks).allSatisfy(c -> assertThat(c.length()).isLessThanOrEqualTo(AppliedJobsImportService.CHUNK_CHARS + 1));
    verify(ai, times(chunks.size())).parseAppliedJobs(anyString());
  }

  @Test
  void ifTheModelFailsOnEveryChunkTheCandidateGetsAClearMessage() {
    when(ai.available()).thenReturn(true);
    when(ai.parseAppliedJobs(anyString())).thenThrow(new RuntimeException("model down"));

    assertThatThrownBy(() -> service.preview(userId, "something"))
        .isInstanceOf(InvalidRequestException.class)
        .hasMessageContaining("Couldn't read");
  }

  @Test
  void emptyOrOversizedInputIsRejectedBeforeAnyModelCall() {
    assertThatThrownBy(() -> service.preview(userId, "  ")).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.preview(userId, "x".repeat(AppliedJobsImportService.MAX_CHARS + 1)))
        .isInstanceOf(InvalidRequestException.class)
        .hasMessageContaining("too much");
    verify(ai, never()).parseAppliedJobs(anyString());
  }

  @Test
  void importCreatesAppliedJobsAndSkipsDuplicatesAndBlanks() {
    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of(tracked("Capgemini", "Python Developer")));

    AppliedJobImport.Result result =
        service.importJobs(
            userId,
            "Naukri",
            List.of(
                item("Backend developer", "Demetrius Technologies", "Pune", "2026-09-30"),
                item("Python Developer", "Capgemini", "Mumbai", null),
                item("Backend developer", "demetrius technologies", null, null),
                item(" ", "Acme", null, null)));

    assertThat(result.created()).isEqualTo(1);
    assertThat(result.skipped()).isEqualTo(3);
    verify(jobListingService)
        .createApplied(eq(userId), eq("Demetrius Technologies"), eq("Backend developer"), eq("Pune"), eq(LocalDate.of(2026, 9, 30)), eq("naukri"));
    verify(jobListingService, times(1)).createApplied(any(), anyString(), anyString(), any(), any(), anyString());
  }

  @Test
  void importingNothingIsAnError() {
    assertThatThrownBy(() -> service.importJobs(userId, "naukri", List.of())).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void importRefusesAnOversizedBatchAndTrimsLongFieldsToTheirColumns() {
    var tooMany = new java.util.ArrayList<AppliedJobImport.Item>();
    for (int i = 0; i < AppliedJobsImportService.MAX_IMPORT_ITEMS + 1; i++) tooMany.add(item("T" + i, "C" + i, null, null));
    org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.importJobs(userId, "naukri", tooMany)).isInstanceOf(com.lifeos.job_tracker.exception.InvalidRequestException.class);

    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of());
    service.importJobs(userId, "x".repeat(200), List.of(item("t".repeat(900), "c".repeat(900), "l".repeat(900), null)));

    var company = org.mockito.ArgumentCaptor.forClass(String.class);
    var title = org.mockito.ArgumentCaptor.forClass(String.class);
    var location = org.mockito.ArgumentCaptor.forClass(String.class);
    var source = org.mockito.ArgumentCaptor.forClass(String.class);
    org.mockito.Mockito.verify(jobListingService).createApplied(org.mockito.ArgumentMatchers.eq(userId), company.capture(), title.capture(), location.capture(), org.mockito.ArgumentMatchers.any(), source.capture());
    org.assertj.core.api.Assertions.assertThat(company.getValue()).hasSize(300);
    org.assertj.core.api.Assertions.assertThat(title.getValue()).hasSize(500);
    org.assertj.core.api.Assertions.assertThat(location.getValue()).hasSize(300);
    org.assertj.core.api.Assertions.assertThat(source.getValue()).hasSize(50);
  }
}
