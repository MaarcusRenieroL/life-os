package com.lifeos.notes.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JournalContentBuilderTest {

  private Map<String, String> prompt(String prompt, String answer) {
    return Map.of("prompt", prompt, "answer", answer);
  }

  @Test
  void rendersEachAnsweredPromptAsAHeadingAndParagraphThenFreeWriting() {
    String html = JournalContentBuilder.build(List.of(prompt("What went well?", "Shipped it.")), "Long day.");

    assertThat(html).isEqualTo("<h3>What went well?</h3><p>Shipped it.</p><h3>Free writing</h3><p>Long day.</p>");
  }

  @Test
  void freeWritingAloneGetsNoHeading() {
    assertThat(JournalContentBuilder.build(List.of(), "Just a thought.")).isEqualTo("<p>Just a thought.</p>");
  }

  @Test
  void escapesUserTextSoItCantInjectMarkup() {
    String html = JournalContentBuilder.build(List.of(prompt("<img src=x onerror=alert(1)>", "\"quoted\" & <script>alert(1)</script>")), "it's <b>fine</b>");

    assertThat(html).doesNotContain("<script").doesNotContain("<img").doesNotContain("<b>");
    assertThat(html).contains("&lt;img src=x onerror=alert(1)&gt;").contains("&quot;quoted&quot; &amp; &lt;script&gt;").contains("it&#39;s &lt;b&gt;fine&lt;/b&gt;");
  }

  @Test
  void blankLinesSplitParagraphsAndSingleNewlinesBecomeBreaks() {
    String html = JournalContentBuilder.paragraphs("line one\nline two\n\nsecond paragraph");

    assertThat(html).isEqualTo("<p>line one<br>line two</p><p>second paragraph</p>");
  }

  @Test
  void anUnansweredPromptIsSkipped() {
    assertThat(JournalContentBuilder.build(List.of(prompt("Q?", "  ")), null)).isEmpty();
  }
}
