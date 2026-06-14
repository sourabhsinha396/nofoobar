from uuid import uuid4

from app.events import dispatcher as dispatcher_mod
from app.events.dispatcher import BackgroundTaskDispatcher, get_dispatcher
from app.events.types import EnrollmentCreated


class FakeBackgroundTasks:
    """Stand-in for fastapi.BackgroundTasks that just records scheduled calls."""

    def __init__(self) -> None:
        self.scheduled: list[tuple] = []

    def add_task(self, func, *args, **kwargs) -> None:
        self.scheduled.append((func, args, kwargs))


def _make_event() -> EnrollmentCreated:
    return EnrollmentCreated(
        org_id=uuid4(),
        enrollment_id=uuid4(),
        course_id=uuid4(),
        course_slug="intro",
        user_id=uuid4(),
        user_email="learner@example.com",
    )


def test_event_type_is_a_class_constant_not_a_field():
    event = _make_event()
    assert EnrollmentCreated.event_type == "enrollment.created"
    # ClassVar must not leak into the serialised payload.
    assert "event_type" not in event.model_dump()


def test_dispatch_schedules_each_subscriber(monkeypatch):
    async def handler_a(event):  # pragma: no cover - never awaited here
        ...

    async def handler_b(event):  # pragma: no cover - never awaited here
        ...

    monkeypatch.setattr(dispatcher_mod, "_subscribers", [handler_a, handler_b])

    bg = FakeBackgroundTasks()
    event = _make_event()
    BackgroundTaskDispatcher(bg).dispatch(event)

    assert [func for func, _, _ in bg.scheduled] == [handler_a, handler_b]
    assert all(args == (event,) for _, args, _ in bg.scheduled)


def test_dispatch_with_no_subscribers_is_a_noop(monkeypatch):
    monkeypatch.setattr(dispatcher_mod, "_subscribers", [])
    bg = FakeBackgroundTasks()

    BackgroundTaskDispatcher(bg).dispatch(_make_event())

    assert bg.scheduled == []


def test_subscribe_appends_to_registry(monkeypatch):
    monkeypatch.setattr(dispatcher_mod, "_subscribers", [])

    async def handler(event):  # pragma: no cover - never awaited here
        ...

    dispatcher_mod.subscribe(handler)
    assert dispatcher_mod._subscribers == [handler]


def test_get_dispatcher_returns_background_task_dispatcher():
    bg = FakeBackgroundTasks()
    dispatcher = get_dispatcher(bg)
    assert isinstance(dispatcher, BackgroundTaskDispatcher)
