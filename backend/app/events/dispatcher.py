from collections.abc import Awaitable, Callable
from typing import Annotated, Protocol

from fastapi import BackgroundTasks, Depends

from app.events.base import DomainEvent

EventHandler = Callable[[DomainEvent], Awaitable[None]]

# Module-level subscriber registry. Consumers append a handler at import time
# (the integration fan-out, wired in a later chunk). The dispatcher stays
# ignorant of who consumes events - it just forwards to whatever is registered.
_subscribers: list[EventHandler] = []


def subscribe(handler: EventHandler) -> None:
    """Register a coroutine to receive every dispatched event. Handlers must
    own their own DB session and swallow their own errors - they run detached
    from the request, after the response has been sent."""
    _subscribers.append(handler)


class Dispatcher(Protocol):
    def dispatch(self, event: DomainEvent) -> None:
        """Hand an event off for delivery and return immediately. Delivery is
        out-of-band; this never blocks or raises into the caller's request path."""
        ...


class BackgroundTaskDispatcher:
    """Delivers events via FastAPI BackgroundTasks: handlers run in-process,
    after the response is sent, on the same event loop.

    This is at-most-once delivery - events are lost on crash/restart and there
    are no retries. That is an accepted trade for now; the Dispatcher seam lets
    us swap in a durable outbox later without changing a single emit site or
    handler.
    """

    def __init__(self, background_tasks: BackgroundTasks) -> None:
        self._background_tasks = background_tasks

    def dispatch(self, event: DomainEvent) -> None:
        for handler in _subscribers:
            self._background_tasks.add_task(handler, event)


def get_dispatcher(background_tasks: BackgroundTasks) -> Dispatcher:
    return BackgroundTaskDispatcher(background_tasks)


# Routes depend on this and call `dispatcher.dispatch(event)` after the relevant
# work has committed. They never touch BackgroundTasks or the subscriber list.
DispatcherDep = Annotated[Dispatcher, Depends(get_dispatcher)]
