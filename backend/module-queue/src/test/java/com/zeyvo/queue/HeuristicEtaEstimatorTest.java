package com.zeyvo.queue;

import com.zeyvo.queue.service.HeuristicEtaEstimator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HeuristicEtaEstimatorTest {

    private final HeuristicEtaEstimator estimator = new HeuristicEtaEstimator();

    @Test
    void no_one_ahead_returns_zero() {
        assertThat(estimator.estimateMinutes(0, 5.0, 3)).isEqualTo(0);
    }

    @Test
    void basic_estimate() {
        // 6 ahead, avg 5 min, 2 windows → ceil(6*5/2) = 15
        assertThat(estimator.estimateMinutes(6, 5.0, 2)).isEqualTo(15);
    }

    @Test
    void single_window_no_division_by_zero() {
        assertThat(estimator.estimateMinutes(3, 4.0, 0)).isEqualTo(12);
    }

    @Test
    void rounds_up_fractional_minutes() {
        // 1 ticket ahead, avg 1.5 min, 1 window → rounds to 2
        assertThat(estimator.estimateMinutes(1, 1.5, 1)).isEqualTo(2);
    }
}
