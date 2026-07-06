from dtw_utils import calculate_dtw_distance, dtw_score


def test_identical_sequences_score_high():
    seq = [10, 20, 30, 40, 50, 60, 50, 40]
    _, score = calculate_dtw_distance(seq, seq)
    assert score >= 95


def test_length_doubled_within_5_points():
    seq = [10, 20, 30, 40, 50, 60, 50, 40]
    doubled = [v for v in seq for _ in range(2)]  # same shape, twice the length
    _, base = calculate_dtw_distance(seq, seq)
    _, stretched = calculate_dtw_distance(doubled, seq)
    assert abs(base - stretched) <= 5


def test_empty_input_returns_zero_score():
    dist, score = calculate_dtw_distance([], [1, 2, 3])
    assert score == 0.0


def test_dtw_score_normalizes_by_path_length():
    # Same per-step deviation over a longer path should not lower the score.
    short = dtw_score(distance=10.0, path=[0] * 10)
    long = dtw_score(distance=100.0, path=[0] * 100)
    assert abs(short - long) < 1e-6
