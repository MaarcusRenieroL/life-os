package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.job_tracker.domains.entity.DiscoveryPreferences;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.service.DiscoveryScorer;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DiscoveryScorerTest {

  private final DiscoveryScorer scorer = new DiscoveryScorer();
  private final UUID userId = UUID.randomUUID();

  private static Skill skill(String name, double years) {
    return Skill.builder().name(name).yearsOfExperience(BigDecimal.valueOf(years)).build();
  }

  @SuppressWarnings("unchecked")
  private static List<String> matched(DiscoveryScorer.Result result) {
    return (List<String>) result.explanation().get("matchedSkills");
  }

  private DiscoveryPreferences prefs() {
    return DiscoveryPreferences.defaults(userId);
  }

  private static final String DESCRIPTION =
      "We build our platform with Java, Spring Boot, PostgreSQL and Kafka on Kubernetes. "
          + "You will design services, review code and ship to production every week.";

  @Test
  void strongSkillOverlapScoresHigh() {
    var prepared =
        scorer.prepare(
            List.of(skill("Java", 3), skill("Spring Boot", 3), skill("PostgreSQL", 2), skill("Kafka", 2)),
            prefs());

    var result = prepared.score("Backend Engineer", "Remote", DESCRIPTION);

    assertThat(result.score()).isGreaterThanOrEqualTo(80);
    assertThat(matched(result))
        .containsExactlyInAnyOrder("Java", "Spring Boot", "PostgreSQL", "Kafka");
  }

  @Test
  void skillNamesMatchAcrossSeparatorsAndAliases() {
    var prepared = scorer.prepare(List.of(skill("Spring-Boot", 3), skill("ReactJS", 3), skill("Postgres", 3)), prefs());

    var result =
        prepared.score(
            "Engineer",
            "Remote",
            "Our stack is spring boot with a React front end, backed by PostgreSQL, deployed weekly by the team.");

    assertThat(matched(result))
        .containsExactlyInAnyOrder("Spring-Boot", "ReactJS", "Postgres");
  }

  @Test
  void shortNamesDoNotMatchOrdinaryWords() {
    var prepared = scorer.prepare(List.of(skill("Go", 3), skill("R", 3), skill("Java", 3)), prefs());

    var result = prepared.score("Engineer", "Remote", "You will go to market with our team and grow the business steadily every quarter.");

    assertThat(matched(result)).isEmpty();
  }

  @Test
  void seniorTitleIsCappedForAJuniorCandidate() {
    var prepared = scorer.prepare(List.of(skill("Java", 1), skill("Spring Boot", 1), skill("Kafka", 1)), prefs());

    var result = prepared.score("Staff Software Engineer", "Remote", DESCRIPTION);

    assertThat(result.score()).isLessThanOrEqualTo(DiscoveryScorer.CAP);
    assertThat((List<?>) result.explanation().get("caps")).isNotEmpty();
  }

  @Test
  void inferredCeilingAllowsOneStepOfStretch() {
    // 3 years => MID, so SENIOR is a stretch (allowed) but STAFF is not.
    var prepared = scorer.prepare(List.of(skill("Java", 3), skill("Spring Boot", 3), skill("Kafka", 3)), prefs());

    assertThat(prepared.score("Senior Backend Engineer", "Remote", DESCRIPTION).score()).isGreaterThan(DiscoveryScorer.CAP);
    assertThat(prepared.score("Staff Backend Engineer", "Remote", DESCRIPTION).score()).isLessThanOrEqualTo(DiscoveryScorer.CAP);
  }

  @Test
  void explicitCeilingIsHard() {
    DiscoveryPreferences p = prefs();
    p.setMaxSeniority(SeniorityLevel.MID);
    var prepared = scorer.prepare(List.of(skill("Java", 8), skill("Spring Boot", 8), skill("Kafka", 8)), p);

    assertThat(prepared.score("Senior Backend Engineer", "Remote", DESCRIPTION).score()).isLessThanOrEqualTo(DiscoveryScorer.CAP);
  }

  @Test
  void noSharedSkillsIsCappedAsWrongField() {
    var prepared = scorer.prepare(List.of(skill("Java", 3), skill("Kafka", 3), skill("Spring Boot", 3)), prefs());

    var result =
        prepared.score(
            "Regional Sales Manager",
            "Remote",
            "Own a territory, manage enterprise accounts, hit quota, and build lasting relationships with customers.");

    assertThat(result.score()).isLessThanOrEqualTo(DiscoveryScorer.CAP);
  }

  @Test
  void aMissingDescriptionIsNeutralNotPenalised() {
    var prepared = scorer.prepare(List.of(skill("Java", 3), skill("Kafka", 3), skill("Spring Boot", 3)), prefs());

    var result = prepared.score("Backend Engineer", "Remote", "");

    assertThat(result.score()).isBetween(50, 90);
    assertThat(result.explanation().get("confidence")).isEqualTo("LOW");
  }

  @Test
  void titleSeniorityReadsJuniorMarkersAheadOfSeniorOnes() {
    assertThat(DiscoveryScorer.titleSeniority("Senior Engineer Intern")).isEqualTo(SeniorityLevel.INTERN);
    assertThat(DiscoveryScorer.titleSeniority("Associate Director, Engineering")).isEqualTo(SeniorityLevel.PRINCIPAL);
    assertThat(DiscoveryScorer.titleSeniority("Leadership Development Intern")).isEqualTo(SeniorityLevel.INTERN);
    assertThat(DiscoveryScorer.titleSeniority("Software Engineer")).isNull();
    assertThat(DiscoveryScorer.titleSeniority("Sr. Software Engineer")).isEqualTo(SeniorityLevel.SENIOR);
  }

  @Test
  void filtersApplyIncludeThenExclude() {
    DiscoveryPreferences p = prefs();
    p.setTitleInclude(List.of("engineer", "developer"));
    p.setTitleExclude(List.of("manager"));

    assertThat(DiscoveryScorer.passesFilters("Backend Engineer", p)).isTrue();
    assertThat(DiscoveryScorer.passesFilters("Engineering Manager", p)).isFalse();
    assertThat(DiscoveryScorer.passesFilters("Recruiter", p)).isFalse();
    assertThat(DiscoveryScorer.passesFilters("Anything", prefs())).isTrue();
  }
}
