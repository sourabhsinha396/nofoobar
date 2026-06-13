import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VideoLessonPicker } from "@/components/lesson/video-lesson-picker";

// Mock the upload helpers - the upload logic itself is exercised in
// tests/lib/video-upload.test.ts. Here we only test the picker's wiring.
vi.mock("@/lib/video-upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/video-upload")>("@/lib/video-upload");
  return {
    ...actual,
    initiateVideoUpload: vi.fn(),
    uploadVideoBytes: vi.fn(),
    pollVideoAsset: vi.fn(),
  };
});

import {
  initiateVideoUpload,
  pollVideoAsset,
  uploadVideoBytes,
  buildPlaybackUrl,
} from "@/lib/video-upload";

const initiateMock = vi.mocked(initiateVideoUpload);
const uploadMock = vi.mocked(uploadVideoBytes);
const pollMock = vi.mocked(pollVideoAsset);

beforeEach(() => {
  initiateMock.mockReset();
  uploadMock.mockReset();
  pollMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VideoLessonPicker - empty state", () => {
  it("renders the upload button and URL input when no URL is set", () => {
    render(<VideoLessonPicker url="" onChange={vi.fn()} orgSlug="acme" />);

    expect(screen.getByRole("button", { name: /upload a video file/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Video URL")).toHaveValue("");
  });

  it("forwards URL typing to onChange", async () => {
    const onChange = vi.fn();
    render(<VideoLessonPicker url="" onChange={onChange} orgSlug="acme" />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Video URL"), "h");

    expect(onChange).toHaveBeenLastCalledWith({ url: "h" });
  });
});

describe("VideoLessonPicker - filled state", () => {
  it("shows a Mux preview iframe when a recognised URL is supplied", () => {
    const { container } = render(
      <VideoLessonPicker
        url="https://player.mux.com/EVa02GuwVnMAiG8aSNFSTguHYMsJME7JxzuKeb02B00efQ"
        onChange={vi.fn()}
        orgSlug="acme"
      />,
    );

    expect(screen.getByText(/Ready/)).toBeInTheDocument();
    const wrapper = container.querySelector("[data-video-embed='mux']");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("iframe")).not.toBeNull();
  });

  it("shows a warning for unrecognised URLs without blocking save", () => {
    render(
      <VideoLessonPicker url="https://wistia.com/medias/abc" onChange={vi.fn()} orgSlug="acme" />,
    );

    expect(screen.getByText(/URL not recognised/i)).toBeInTheDocument();
  });

  it("clears the URL when the remove button is clicked", async () => {
    const onChange = vi.fn();
    render(
      <VideoLessonPicker url="https://youtu.be/abc12345" onChange={onChange} orgSlug="acme" />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /remove video/i }));

    expect(onChange).toHaveBeenCalledWith({ url: "", durationSeconds: undefined });
  });
});

describe("VideoLessonPicker - upload flow", () => {
  it("uploads bytes, polls, and reports the resulting Mux URL + duration", async () => {
    initiateMock.mockResolvedValueOnce({
      video_asset_id: "vid-1",
      upload_url: "https://signed.example.com/upload",
      provider: "mux",
    });
    uploadMock.mockResolvedValueOnce(undefined);
    pollMock.mockResolvedValueOnce({
      id: "vid-1",
      provider: "mux",
      status: "ready",
      playback_ref: "playback_xyz",
      duration_seconds: 42,
      max_resolution_height: 720,
    });

    const onChange = vi.fn();
    const onBusy = vi.fn();
    const { container } = render(
      <VideoLessonPicker url="" onChange={onChange} onBusyChange={onBusy} orgSlug="acme" />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const file = new File([new Uint8Array([1, 2, 3])], "intro.mp4", { type: "video/mp4" });
    const user = userEvent.setup();
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        url: buildPlaybackUrl("mux", "playback_xyz"),
        durationSeconds: 42,
      });
    });

    expect(initiateMock).toHaveBeenCalledWith("acme");
    expect(uploadMock).toHaveBeenCalled();
    expect(pollMock).toHaveBeenCalledWith("acme", "vid-1", expect.any(Object));
    // Busy callback should have toggled true then false.
    expect(onBusy.mock.calls.flat()).toEqual([true, false]);
  });

  it("shows the processing message after bytes are uploaded", async () => {
    initiateMock.mockResolvedValueOnce({
      video_asset_id: "vid-1",
      upload_url: "https://signed.example.com/upload",
      provider: "mux",
    });
    uploadMock.mockResolvedValueOnce(undefined);
    // Hang the poll so we can observe the "processing" UI mid-flight.
    let resolvePoll: (v: never) => void = () => {};
    pollMock.mockImplementationOnce(() => new Promise((r) => (resolvePoll = r as never)));

    render(<VideoLessonPicker url="" onChange={vi.fn()} orgSlug="acme" />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(fileInput, new File([new Uint8Array([1])], "v.mp4", { type: "video/mp4" }));

    await screen.findByText(/Processing video/i);
    resolvePoll({
      id: "vid-1",
      provider: "mux",
      status: "ready",
      playback_ref: "p",
      duration_seconds: 5,
      max_resolution_height: 720,
    } as never);
  });

  it("renders a friendly error when the upload initiation 503s", async () => {
    const { ApiError } = await import("@/lib/api");
    initiateMock.mockRejectedValueOnce(new ApiError(503, "not configured"));

    render(<VideoLessonPicker url="" onChange={vi.fn()} orgSlug="acme" />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(fileInput, new File([new Uint8Array([1])], "v.mp4", { type: "video/mp4" }));

    expect(await screen.findByText(/aren't configured/i)).toBeInTheDocument();
  });
});
