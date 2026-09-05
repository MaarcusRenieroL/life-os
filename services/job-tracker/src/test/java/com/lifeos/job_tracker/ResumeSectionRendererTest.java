package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.job_tracker.domains.record.SectionView;
import com.lifeos.job_tracker.integration.ResumeSectionRenderer;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ResumeSectionRendererTest {

  private final ResumeSectionRenderer renderer = new ResumeSectionRenderer();

  @Test
  void rendersExperienceEntriesWithHeadingAndBullets() {
    SectionView experience =
        new SectionView(
            "EXPERIENCE",
            "Experience",
            List.of(
                Map.of(
                    "position", "Senior Backend Engineer",
                    "company", "Acme",
                    "startDate", "2022",
                    "endDate", "",
                    "bullets", List.of("Cut p99 latency by 40%", "Led the migration to Kafka"))));

    String markdown = renderer.toMarkdown(List.of(experience));

    assertThat(markdown).contains("## Experience");
    assertThat(markdown).contains("Senior Backend Engineer - Acme");
    assertThat(markdown).contains("2022 - Present");
    assertThat(markdown).contains("- Cut p99 latency by 40%");
    assertThat(markdown).contains("- Led the migration to Kafka");
  }

  @Test
  void skipsSectionsWithNoContentAndFallsBackForUnknownShapes() {
    SectionView empty = new SectionView("PROJECTS", "Projects", List.of());
    SectionView unknownShape = new SectionView("SUMMARY", "Summary", List.of("just a plain string entry"));

    String markdown = renderer.toMarkdown(List.of(empty, unknownShape));

    assertThat(markdown).doesNotContain("## Projects");
    assertThat(markdown).contains("## Summary");
  }
}
