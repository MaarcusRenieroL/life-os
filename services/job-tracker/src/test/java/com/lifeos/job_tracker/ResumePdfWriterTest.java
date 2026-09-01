package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.job_tracker.integration.ResumePdfWriter;
import org.junit.jupiter.api.Test;

class ResumePdfWriterTest {

  @Test
  void rendersMarkdownToANonEmptyPdf() {
    byte[] pdf =
        new ResumePdfWriter()
            .fromMarkdown(
                """
                # Jane Doe
                ## Experience
                - Built a very long bullet point that definitely needs to wrap across multiple lines to exercise the wrapping logic in the writer
                ## Education
                BSc Computer Science
                """);

    assertThat(pdf).isNotEmpty();
    assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
  }
}
