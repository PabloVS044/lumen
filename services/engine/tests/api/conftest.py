import pytest


@pytest.fixture
def flat_horizon(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sustituye la máscara de R2 por un horizonte plano (solo en tests)."""
    from lumen.v1 import horizon_pb2

    from lumen_engine.horizon import mask

    def fake(site: object, *, az_step_deg: float, max_range_km: float) -> horizon_pb2.HorizonMask:
        return horizon_pb2.HorizonMask(
            az_step_deg=1.0, elevation_deg=[0.0] * 360, observer=horizon_pb2.Observer()
        )

    monkeypatch.setattr(mask, "compute", fake)
