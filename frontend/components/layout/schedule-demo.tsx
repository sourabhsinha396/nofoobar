"use client";

import { useEffect } from "react";
import { getCalApi } from "@calcom/embed-react";

export function ScheduleDemo({ className }: { className?: string }) {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "demo" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <button
      type="button"
      data-cal-namespace="demo"
      data-cal-link="nofoobar/demo"
      data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
      className={className}
    >
      Schedule a demo
    </button>
  );
}
