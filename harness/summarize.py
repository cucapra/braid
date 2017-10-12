#!/usr/bin/env python3
import os
import json
from uncertain import umean
import sys
import statistics
import math

TIMINGS_DIR = 'collected'


def get_latencies(data):
    """Get the list of frame latencies and draw latencies for a
    benchmark.
    """
    msgs = data['messages'][1:]  # Skip the first message as a "warmup."

    all_latencies = []
    all_draw_latencies = []
    for msg in msgs:
        # As a sanity check, we can get an average frame latency for the
        # entire message with:
        # avg_latency = msg['ms'] / msg['frames']

        all_latencies += msg['latencies']
        all_draw_latencies += msg['draw_latencies']

    # More sanity checking: we should have the same number of overall and
    # draw-call latencies, and the draw latency should always be less than the
    # overall latency.
    assert len(all_latencies) == len(all_draw_latencies)
    # print(data['fn'], file=sys.stderr)
    for l, dl in zip(all_latencies, all_draw_latencies):
        # print(l, dl, file=sys.stderr)
        assert dl <= l

    return all_latencies, all_draw_latencies


def summarize_unc(unc):
    """Format an uncertain value as a Vega-ready JSON-style dictionary.
    """
    return {
        'value': unc.value,
        'error': unc.error,
        'err_min': unc.value - unc.error,
        'err_max': unc.value + unc.error,
    }


# Based on:
# http://stackoverflow.com/a/2753343/39182
def quantile(data, frac):
    """Get a quantile of a *sorted* list of values.
    """
    k = (len(data) - 1) * frac
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return data[int(k)]
    d0 = data[int(f)] * (c - k)
    d1 = data[int(c)] * (k - f)
    return d0 + d1


def stats(values):
    """Summarize the sequence of latency values.
    """
    mean = statistics.mean(values)
    stdev = statistics.stdev(values, xbar=mean)
    se = stdev / math.sqrt(len(values))  # Standard error of the mean.
    svalues = sorted(values)
    return {
        'mean': mean,
        'stdev': stdev,
        'se': se,
        'mean_minus_stdev': mean - stdev,
        'mean_plus_stdev': mean + stdev,
        'mean_minus_se': mean - se,
        'mean_plus_se': mean + se,
        'q50': quantile(svalues, 0.5),
        'q90': quantile(svalues, 0.9),
        'q95': quantile(svalues, 0.95),
        'q99': quantile(svalues, 0.99),
        'median': statistics.median_grouped(svalues),
        'min': svalues[0],
        'max': svalues[-1],
    }


def summarize(as_json, as_madoko):
    """Summarize all the collected data."""
    out = []
    for fn in os.listdir(TIMINGS_DIR):
        path = os.path.join(TIMINGS_DIR, fn)
        with open(path) as f:
            data = json.load(f)
        latencies, draw_latencies = get_latencies(data)
        latency, draw_latency = umean(latencies), umean(draw_latencies)
        name, _ = os.path.splitext(os.path.basename(data['fn']))

        if as_json:
            # Emit a Vega-ready data record.
            latency_stats, draw_latency_stats = \
                stats(latencies), stats(draw_latencies)
            out.append({
                'name': name,
                'latency': latency_stats,
                'draw_latency': draw_latency_stats,
            })

        elif as_madoko:
            # Emit Madoko definitions for inclusion in text.
            prefix = 'data-{}-'.format(name)
            ms = '&nbsp;ms'
            print(prefix + 'latency:',
                  '{:.1f}'.format(latency.value) + ms)
            print(prefix + 'draw-latency:',
                  '{:.1f}'.format(draw_latency.value) + ms)
            draw_frac = draw_latency.value / latency.value
            print(prefix + 'draw-frac: {:.0%}'.format(draw_frac))

        else:
            # Human-readable.
            print(data['fn'])
            print('frame latency:', latency, 'ms')
            print('draw latency:', draw_latency, 'ms')
            print('fps:', 1000.0 / latency)

    if as_json:
        json.dump(out, sys.stdout, sort_keys=True, indent=2)


if __name__ == '__main__':
    summarize('-j' in sys.argv, '-m' in sys.argv)
