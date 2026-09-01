package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.repository.SkillRepository;
import com.lifeos.job_tracker.service.JobMatchingService;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobMatchingServiceTest {

  @Mock private SkillRepository skillRepository;
  @InjectMocks private JobMatchingService jobMatchingService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void scoresHighWhenAllRequiredSkillsMatchAndPerksAreGood() {
    when(skillRepository.findAllByUserIdOrderByNameAsc(userId))
        .thenReturn(List.of(skill("Java"), skill("Spring Boot"), skill("PostgreSQL")));

    JobListing job = new JobListing();
    job.setRequiredSkills(List.of("Java", "Spring Boot", "PostgreSQL"));
    job.setWorkModel(WorkModel.REMOTE);
    job.setVisaSponsorship(VisaSponsorship.YES);
    job.setJobDescriptionText("Backend role");

    JobFitResult result = jobMatchingService.score(userId, job);

    assertThat(result.score()).isGreaterThanOrEqualTo(85);
    assertThat(result.explanation()).containsKey("strongMatches");
    assertThat(strings(result, "missingSkills")).isEmpty();
  }

  @Test
  void flagsMissingSkillsAndPenalisesWhenNothingMatches() {
    when(skillRepository.findAllByUserIdOrderByNameAsc(userId)).thenReturn(List.of(skill("COBOL")));

    JobListing job = new JobListing();
    job.setRequiredSkills(List.of("Rust", "Kubernetes"));
    job.setVisaSponsorship(VisaSponsorship.NO);

    JobFitResult result = jobMatchingService.score(userId, job);

    assertThat(result.score()).isLessThan(60);
    assertThat(strings(result, "missingSkills")).containsExactlyInAnyOrder("Rust", "Kubernetes");
    assertThat(strings(result, "redFlags")).contains("No visa sponsorship");
  }

  @SuppressWarnings("unchecked")
  private static List<String> strings(JobFitResult result, String key) {
    return (List<String>) result.explanation().get(key);
  }

  private static Skill skill(String name) {
    return Skill.builder().id(UUID.randomUUID()).name(name).build();
  }
}
