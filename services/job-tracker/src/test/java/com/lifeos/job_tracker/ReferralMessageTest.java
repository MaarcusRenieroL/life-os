package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.CareerProfile;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.record.KnownPerson;
import java.util.List;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.CareerProfileService;
import com.lifeos.job_tracker.service.JobListingService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReferralMessageTest {

  @Mock private JobListingRepository jobListingRepository;
  @Mock private CompanyRepository companyRepository;
  @Mock private AiAssistant ai;
  @Mock private CareerProfileService careerProfileService;
  @InjectMocks private JobListingService jobListingService;

  private final UUID userId = UUID.randomUUID();
  private final UUID jobId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    when(jobListingRepository.findByIdAndUserId(jobId, userId))
        .thenReturn(
            Optional.of(
                JobListing.builder()
                    .id(jobId)
                    .company("Stripe")
                    .title("Backend Engineer")
                    .externalId("R-1234")
                    .url("https://stripe.com/jobs/1234")
                    .build()));
    // Only the message tests read the profile; the known-people tests never touch it.
    org.mockito.Mockito.lenient()
        .when(careerProfileService.getProfileOrNull(userId))
        .thenReturn(CareerProfile.builder().fullName("Maarcus Reniero").build());
  }

  @Test
  void fillsTheStandardAskWithTheJobsDetailsAndSignsWithTheFirstName() {
    String message = jobListingService.referralMessage(userId, jobId, null);

    assertThat(message)
        .isEqualTo(
            "Hi,\n\nHope you are doing good.\n"
                + "I found an opening at Stripe for the role Backend Engineer and am very interested in applying for the same.\n\n"
                + "Could you please help me with a referral?\n"
                + "Job Id: R-1234\n"
                + "Job Link: https://stripe.com/jobs/1234\n\n"
                + "Regards,\nMaarcus");
  }

  @Test
  void greetsTheContactByFirstNameOnly() {
    assertThat(jobListingService.referralMessage(userId, jobId, "  Priya Sharma ")).startsWith("Hi Priya,\n\n");
  }

  @Test
  void leavesBlankFieldsBlankRatherThanPrintingNull() {
    when(jobListingRepository.findByIdAndUserId(jobId, userId))
        .thenReturn(Optional.of(JobListing.builder().id(jobId).company("Acme").title("Dev").build()));
    when(careerProfileService.getProfileOrNull(userId)).thenReturn(null);

    String message = jobListingService.referralMessage(userId, jobId, "");

    assertThat(message).doesNotContain("null").contains("Job Id: \n").contains("Job Link: \n").endsWith("Regards,\n");
  }

  @Test
  void knownPeopleAreSavedOnTheCompanySoEveryRoleThereSharesThem() {
    Company company = Company.builder().id(UUID.randomUUID()).userId(userId).name("Stripe").build();
    when(companyRepository.findByUserIdAndNameIgnoreCase(userId, "Stripe")).thenReturn(Optional.of(company));
    when(jobListingRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(companyRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    List<KnownPerson> saved =
        jobListingService.saveKnownPeople(
            userId,
            jobId,
            List.of(new KnownPerson("  Priya Sharma ", " ex-colleague "), new KnownPerson("  ", "blank name"), new KnownPerson("Sam", "")));

    assertThat(saved).containsExactly(new KnownPerson("Priya Sharma", "ex-colleague"), new KnownPerson("Sam", null));
    assertThat(company.getKnownPeople()).isEqualTo(saved);
    verify(companyRepository).save(company);
  }

  @Test
  void aJobWithNoLinkedCompanyReportsNoKnownPeople() {
    assertThat(jobListingService.knownPeople(userId, jobId)).isEmpty();
  }
}
