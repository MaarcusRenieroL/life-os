package com.lifeos.core.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class StatisticsTest {

  @Test
  void meanAndPopulationStdDev() {
    List<Double> values = List.of(2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0);

    assertThat(Statistics.mean(values)).isEqualTo(5.0);
    assertThat(Statistics.stdDev(values)).isEqualTo(2.0);
  }

  @Test
  void emptyInputIsZeroNotAnError() {
    assertThat(Statistics.mean(List.of())).isZero();
    assertThat(Statistics.stdDev(List.of())).isZero();
  }

  @Test
  void pearsonOfPerfectlyLinearSeriesIsPlusOrMinusOne() {
    assertThat(Statistics.pearson(List.of(1.0, 2.0, 3.0, 4.0), List.of(2.0, 4.0, 6.0, 8.0))).isCloseTo(1.0, org.assertj.core.data.Offset.offset(1e-9));
    assertThat(Statistics.pearson(List.of(1.0, 2.0, 3.0, 4.0), List.of(8.0, 6.0, 4.0, 2.0))).isCloseTo(-1.0, org.assertj.core.data.Offset.offset(1e-9));
  }

  @Test
  void pearsonMatchesAKnownValue() {
    // Classic worked example: r = 0.8 for these ten pairs.
    List<Double> x = List.of(1.0, 2.0, 3.0, 4.0, 5.0);
    List<Double> y = List.of(2.0, 1.0, 4.0, 3.0, 5.0);

    assertThat(Statistics.pearson(x, y)).isCloseTo(0.8, org.assertj.core.data.Offset.offset(1e-9));
  }

  @Test
  void pearsonIsNullWhenItCannotBeComputed() {
    assertThat(Statistics.pearson(List.of(1.0), List.of(1.0))).isNull();
    assertThat(Statistics.pearson(List.of(1.0, 2.0), List.of(1.0))).isNull();
    // A constant series has no variance to correlate.
    assertThat(Statistics.pearson(List.of(3.0, 3.0, 3.0), List.of(1.0, 2.0, 3.0))).isNull();
  }
}
