package com.lifeos.core.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.common.web.Bounds;
import org.junit.jupiter.api.Test;

class BoundsTest {

  @Test
  void valuesAreBroughtIntoRange() {
    assertThat(Bounds.clamp(99_999, 1, 730)).isEqualTo(730);
    assertThat(Bounds.clamp(-5, 1, 730)).isEqualTo(1);
    assertThat(Bounds.clamp(30, 1, 730)).isEqualTo(30);
    assertThat(Bounds.page(-3)).isZero();
    assertThat(Bounds.page(4)).isEqualTo(4);
    assertThat(Bounds.size(1_000_000_000, 100)).isEqualTo(100);
    assertThat(Bounds.size(0, 100)).isEqualTo(1);
  }
}
