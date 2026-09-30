package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class TemplateRendererTest {

  @Test
  void fillsPlaceholders() {
    assertThat(TemplateRenderer.render("Follow up: {{title}} ({{status}})", Map.of("title", "SWE at Acme", "status", "APPLIED"))).isEqualTo("Follow up: SWE at Acme (APPLIED)");
  }

  @Test
  void toleratesWhitespaceInsideTheBraces() {
    assertThat(TemplateRenderer.render("Hi {{ title }}", Map.of("title", "there"))).isEqualTo("Hi there");
  }

  @Test
  void unknownPlaceholdersBecomeEmptyInsteadOfLeakingBraces() {
    assertThat(TemplateRenderer.render("Task {{nope}} done", Map.of())).isEqualTo("Task  done");
  }

  @Test
  void valuesWithRegexOrReplacementCharactersAreInsertedLiterally() {
    assertThat(TemplateRenderer.render("{{title}}", Map.of("title", "Cost $5 \\ and $1"))).isEqualTo("Cost $5 \\ and $1");
  }

  @Test
  void nullTemplateStaysNull() {
    assertThat(TemplateRenderer.render(null, Map.of())).isNull();
  }
}
