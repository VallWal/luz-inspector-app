"use client";

import { useEffect, useRef, useState } from "react";
import { inspector, type Property } from "../data";
import { BackButton, CheckIcon } from "./icons";
import { submitVoiceEvent } from "../lib/eventSubmission";

interface EventPhotoDraft {
  file: File;
  localObjectUrl: string;
}

interface Props {
  properties: Property[];
  onBack: () => void;
  onDone: () => void;
}

interface RecordedAudio {
  blob: Blob;
  localObjectUrl: string;
  mimeType: string;
  durationSec: number;
  recordedAt: string;
}

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordEventScreen({
  properties,
  onBack,
  onDone,
}: Props) {
  // ---- Property selection (optional) ------------------------------------------
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const selected: Property | null =
    properties.find((p) => p.id === propertyId) ?? null;

  // ---- Voice recording (same MediaRecorder pattern as ReportFindingSheet) ------
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const secondsRef = useRef(0);
  const tickRef = useRef<number | null>(null);

  // ---- Optional photos ------------------------------------------------------------
  const [photos, setPhotos] = useState<EventPhotoDraft[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Materialize the FileList NOW — it's a live object that empties when the
    // input value is reset right after this call.
    const drafts = Array.from(files).map((file) => ({
      file,
      localObjectUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...drafts]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.localObjectUrl);
      return next;
    });
  };

  // ---- Submission ---------------------------------------------------------------
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  useEffect(
    () => () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    },
    []
  );

  const startRecording = async () => {
    setMicError(null);
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMicError("Voice recording is not supported on this device/browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudio({
          blob,
          localObjectUrl: URL.createObjectURL(blob),
          mimeType: blob.type || mimeType,
          durationSec: secondsRef.current,
          recordedAt: new Date().toISOString(),
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          secondsRef.current = s + 1;
          return s + 1;
        });
      }, 1000);
    } catch {
      setMicError("Microphone not available. Check permissions and try again.");
    }
  };

  const stopRecording = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  const deleteRecording = () => {
    if (audio) URL.revokeObjectURL(audio.localObjectUrl);
    setAudio(null);
    setSeconds(0);
    setSubmitState("idle");
  };

  const submit = () => {
    if (!audio || submitState === "submitting") return;
    setSubmitState("submitting");
    submitVoiceEvent({
      audio: audio.blob,
      audioMimeType: audio.mimeType,
      recordingDuration: audio.durationSec,
      recordedAt: audio.recordedAt,
      propertyId: selected?.id,
      propertyName: selected?.name,
      createdBy: inspector,
      photos: photos.map((p, i) => ({
        blob: p.file,
        name: p.file.name || `photo-${i}.jpg`,
      })),
    })
      .then((res) => {
        console.log("Voice event webhook response", res.status, res.body);
        setSubmitState("success");
      })
      .catch((err) => {
        console.error("Voice event submission failed", err);
        setSubmitState("error");
      });
  };

  // ---- Success state ------------------------------------------------------------
  if (submitState === "success") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-navy text-white">
          <CheckIcon size={28} />
        </span>
        <h1 className="text-xl font-semibold text-navy">
          Event recorded successfully.
        </h1>
        {selected && (
          <p className="-mt-2 text-sm text-navy/60">{selected.name}</p>
        )}
        <button
          onClick={onDone}
          className="mt-4 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-navy text-base font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] hover:bg-navy-deep"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Top navigation */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <BackButton onClick={onBack} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Voice Log
          </p>
          <h1 className="text-base font-semibold text-navy">Record Event</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pb-8 pt-3">
        {/* Property selector (optional) */}
        <section className="rounded-3xl bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Property (optional)
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {properties.map((p) => {
              const isSelected = p.id === propertyId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPropertyId(isSelected ? null : p.id)}
                  className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? "border-navy bg-navy text-white"
                      : "border-navy/10 bg-white text-navy"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {p.name}
                    </span>
                    <span
                      className={`block text-xs ${
                        isSelected ? "text-white/60" : "text-navy/50"
                      }`}
                    >
                      {p.kind}
                    </span>
                  </span>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isSelected
                        ? "bg-white/15 text-white"
                        : "bg-beige text-navy/70"
                    }`}
                  >
                    {p.code}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recorder */}
        <section className="flex flex-1 flex-col rounded-3xl bg-white px-5 py-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            🎤 Voice Event
          </p>

          {audio ? (
            /* Recorded — playback / delete / re-record */
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-2xl bg-beige-soft px-4 py-4">
                <p className="text-sm font-semibold text-navy">
                  Recording · {formatClock(audio.durationSec)}
                </p>
                <audio
                  controls
                  src={audio.localObjectUrl}
                  className="mt-2 h-9 w-full"
                />
              </div>
              <button
                onClick={deleteRecording}
                disabled={submitState === "submitting"}
                className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-status-red/30 bg-status-red-soft text-sm font-semibold text-status-red transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Delete &amp; Re-record
              </button>
            </div>
          ) : (
            /* Not recorded yet — big record / stop button */
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4 py-4">
              <button
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? "Stop recording" : "Start recording"}
                className={`flex size-24 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 ${
                  recording
                    ? "anim-pop-fast bg-status-red shadow-status-red/30"
                    : "bg-navy shadow-navy/25 hover:bg-navy-deep"
                }`}
              >
                {recording ? (
                  <span className="size-7 rounded-md bg-white" />
                ) : (
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <rect
                      x="9"
                      y="3"
                      width="6"
                      height="12"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  recording ? "text-status-red" : "text-navy/40"
                }`}
              >
                {recording ? formatClock(seconds) : "Tap to record"}
              </p>
              {micError && (
                <p className="text-center text-sm text-status-red">{micError}</p>
              )}
            </div>
          )}
        </section>

        {/* Optional photos */}
        <section className="rounded-3xl bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            📷 Photos (optional)
          </p>
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={photo.localObjectUrl} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.localObjectUrl}
                    alt={`Photo ${i + 1}`}
                    className="size-16 rounded-xl object-cover"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={submitState === "submitting"}
              className="flex h-11 flex-1 items-center justify-center rounded-2xl border-2 border-navy/15 bg-beige-soft text-sm font-semibold text-navy transition-all active:scale-[0.98] disabled:opacity-50"
            >
              📸 Take Photo
            </button>
            <button
              onClick={() => libraryInputRef.current?.click()}
              disabled={submitState === "submitting"}
              className="flex h-11 flex-1 items-center justify-center rounded-2xl border-2 border-navy/15 bg-beige-soft text-sm font-semibold text-navy transition-all active:scale-[0.98] disabled:opacity-50"
            >
              🖼️ From Library
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
        </section>

        {/* Upload error */}
        {submitState === "error" && (
          <p className="text-center text-sm font-semibold text-status-red">
            Upload failed. Please try again.
          </p>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!audio || submitState === "submitting"}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-navy text-lg font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] enabled:hover:bg-navy-deep disabled:opacity-40"
        >
          {submitState === "submitting" ? "Sending…" : "Submit Event"}
        </button>
      </main>
    </div>
  );
}
