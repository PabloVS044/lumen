"""Banda de horizonte de clones LOLA de 5 m. Owner: R2. Sección 9.12."""

from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np
import numpy.typing as npt
from lumen.v1 import common_pb2

from lumen_engine.core.errors import EngineError
from lumen_engine.dem import index
from lumen_engine.dem.raster import read_disk, read_points
from lumen_engine.ephem.spice import EphemerisSeries
from lumen_engine.horizon.mask import compute
from lumen_engine.metrics.compute import compute as compute_metrics
from lumen_engine.metrics.score import HIGHER_IS_BETTER
from lumen_engine.visibility.compute import compute as compute_visibility

FloatArray = npt.NDArray[np.float64]


@dataclass(frozen=True)
class MetricEnvelope:
    p05: float
    p50: float
    p95: float


@dataclass(frozen=True)
class HorizonEnvelope:
    az_step_deg: float
    p05_deg: FloatArray
    p50_deg: FloatArray
    p95_deg: FloatArray
    clone_count: int
    metrics: dict[str, MetricEnvelope] = field(default_factory=dict)


def clone_envelope(
    site: common_pb2.Site,
    clone_paths: list[Path],
    *,
    az_step_deg: float = 0.25,
    max_range_km: float = 200.0,
    ephemeris: EphemerisSeries | None = None,
    thresholds: common_pb2.Thresholds | None = None,
) -> HorizonEnvelope:
    """Percentiles de horizonte y métricas; comparte efemérides entre clones del mismo sitio."""
    if len(clone_paths) < 2:
        raise EngineError("TOO_FEW_CLONES", "At least two DEM clones are required.")
    found = index.require_coverage(site.lat, site.lon)
    fine = found[0]
    all_layers = index.layers()
    windows = {
        layer.id: read_disk(
            layer,
            site.lat,
            site.lon,
            min(
                max_range_km * 1000.0,
                40_000.0 if layer.resolution_m <= 40 else max_range_km * 1000.0,
            ),
        )
        for layer in all_layers
        if layer.id != fine.id and layer.resolution_m < 200
    }
    samples = []
    metric_samples: dict[str, list[float]] = {name: [] for name in HIGHER_IS_BETTER}
    for clone_path in clone_paths:
        clone = replace(fine, path=str(clone_path))
        windows[fine.id] = read_disk(
            clone, site.lat, site.lon, min(10_000.0, max_range_km * 1000.0)
        )
        h0 = float(read_points(clone, np.array([site.lon]), np.array([site.lat]))[0])
        if not np.isfinite(h0):
            raise EngineError("CLONE_NO_COVERAGE", f"Clone has no data at site: {clone_path.name}")
        result = compute(
            site,
            az_step_deg=az_step_deg,
            max_range_km=max_range_km,
            terrain_height_m=h0,
            preloaded_windows=windows,
        )
        samples.append(result.elevation_deg)
        if ephemeris is not None:
            visibility = compute_visibility(
                ephemeris.sun,
                ephemeris.earth,
                np.asarray(result.elevation_deg),
                az_step_deg,
                thresholds or common_pb2.Thresholds(),
            )
            metrics = compute_metrics(ephemeris.grid, ephemeris.sun, ephemeris.earth, visibility)
            for name in HIGHER_IS_BETTER:
                metric_samples[name].append(float(getattr(metrics, name)))
    p05, p50, p95 = np.percentile(np.asarray(samples), [5, 50, 95], axis=0)
    envelopes = {
        name: MetricEnvelope(*map(float, np.percentile(values, [5, 50, 95])))
        for name, values in metric_samples.items()
        if values
    }
    return HorizonEnvelope(az_step_deg, p05, p50, p95, len(samples), envelopes)
