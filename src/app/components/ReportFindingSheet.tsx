"use client";

import { useEffect, useRef, useState } from "react";
import {
  HEALTH_DIMENSIONS,
  type FindingDraft,
  type HealthDimension,
  type InspectionZone,
  type Severity,
  type VoiceRecording,
} from "@/types/inspection";

const DIMENSION_EMOJI: Record<HealthDimension, string> = {
  "Security & Access": "🛡️",
  "Water & Humidity": "💧",
  "Utilities & Systems": "⚡",
  "Building Condition": "🏠",
  "Outdoor Areas": "🌳",
};

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  zone: InspectionZone;
  onClose: () => void;
  onSave: (draft: FindingDraft) => void;
}

export default function ReportFindingSheet({ zone, onClose, onSave }: Props) {
  const [dimension, setDimension] = useState<HealthDimension | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [voice, setVoice] = useState<VoiceRecording | null>(null);
  const [note, setNote] = useState("");

  // ---- Voice recording -------------------------------------------------------
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const secondsRef = useRef(0);
  const tickRef = useRef<number | null>(null);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setVoice({
          url: URL.createObjectURL(blob),
          durationSec: secondsRef.current,
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
      setMicError("Microphone not available — use the notes field instead.");
    }
  };

  const stopRecording = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  const deleteRecording = () => {
    if (voice) URL.revokeObjectURL(voice.url);
    setVoice(null);
    setSeconds(0);
  };

  // ---- Photos (evidence) --------------------------------------------------------
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotos((prev) => [
      ...prev,
      ...Array.from(files).map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url);
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

  const movePhoto = (index: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const canSave = dimension !== null && severity !== null;

  return (
    // Fixed to the viewport: never offset by screen scroll position
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="anim-fade-in absolute inset-0 cursor-default bg-navy-deep/50 backdrop-blur-[2px]"
      />
      <div className="anim-sheet-up relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy/15" />
        <h3 className="text-xl font-semibold text-navy">Report Finding</h3>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-navy/50">
          Current Zone
        </p>
        <p className="text-base font-semibold text-navy">{zone.title}</p>

        {/* Affected Property Health Area (fixed across the Luz platform) */}
        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-navy/50">
          Affected Property Health Area
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {HEALTH_DIMENSIONS.map((d) => {
            const selected = dimension === d;
            return (
              <button
                key={d}
                onClick={() => setDimension(d)}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.99] ${
                  selected
                    ? "border-navy bg-navy text-white shadow-md shadow-navy/20"
                    : "border-navy/10 bg-white text-navy/70 hover:border-navy/25"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {DIMENSION_EMOJI[d]}
                </span>
                {d}
              </button>
            );
          })}
        </div>

        {/* Severity */}
        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-navy/50">
          Severity
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => setSeverity("monitor")}
            className={`rounded-2xl border-2 py-3.5 text-sm font-semibold transition-all ${
              severity === "monitor"
                ? "border-status-yellow bg-status-yellow-soft text-status-yellow"
                : "border-navy/10 text-navy/60"
            }`}
          >
            🟡 Monitor
          </button>
          <button
            onClick={() => setSeverity("immediate")}
            className={`rounded-2xl border-2 py-3.5 text-sm font-semibold transition-all ${
              severity === "immediate"
                ? "border-status-red bg-status-red-soft text-status-red"
                : "border-navy/10 text-navy/60"
            }`}
          >
            🔴 Immediate Action
          </button>
        </div>

        {/* Evidence — photos are first-class */}
        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-navy/50">
          📷 Evidence
        </p>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-4">
            {photos.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Evidence photo ${i + 1}`}
                  className="size-20 rounded-xl object-cover shadow-sm"
                />
                {/* 44px hit areas with small visuals inside */}
                <button
                  aria-label="Remove photo"
                  onClick={() => removePhoto(url)}
                  className="absolute -right-2 -top-2 flex size-11 items-center justify-center"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white shadow">
                    ✕
                  </span>
                </button>
                {photos.length > 1 && (
                  <>
                    {i > 0 && (
                      <button
                        aria-label="Move photo left"
                        onClick={() => movePhoto(i, -1)}
                        className="absolute -bottom-2 -left-2 flex size-11 items-center justify-center"
                      >
                        <span className="flex size-5 items-center justify-center rounded-full bg-navy-deep/70 text-[10px] font-bold text-white backdrop-blur-sm">
                          ‹
                        </span>
                      </button>
                    )}
                    {i < photos.length - 1 && (
                      <button
                        aria-label="Move photo right"
                        onClick={() => movePhoto(i, 1)}
                        className="absolute -bottom-2 -right-2 flex size-11 items-center justify-center"
                      >
                        <span className="flex size-5 items-center justify-center rounded-full bg-navy-deep/70 text-[10px] font-bold text-white backdrop-blur-sm">
                          ›
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex h-14 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-navy/60 transition-colors hover:border-navy/30"
          >
            <span className="text-sm font-semibold">📷 Take photo</span>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex h-14 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-navy/60 transition-colors hover:border-navy/30"
          >
            <span className="text-sm font-semibold">🖼️ Choose photos</span>
          </button>
        </div>

        {/* Voice description — primary documentation method */}
        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-navy/50">
          🎤 Voice Description
        </p>
        <div className="mt-2 rounded-2xl bg-beige-soft px-4 py-5">
          {voice ? (
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">
                  Recording · {formatDuration(voice.durationSec)}
                </p>
                <audio controls src={voice.url} className="mt-1.5 h-8 w-full" />
              </div>
              <button
                onClick={deleteRecording}
                className="flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-status-red"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? "Stop recording" : "Start recording"}
                className={`flex size-20 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 ${
                  recording
                    ? "anim-pop-fast bg-status-red shadow-status-red/30"
                    : "bg-navy shadow-navy/25 hover:bg-navy-deep"
                }`}
              >
                {recording ? (
                  <span className="size-6 rounded-md bg-white" />
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <p className="mt-3 text-sm font-medium text-navy/70">
                {recording ? (
                  <span className="font-semibold text-status-red">
                    Recording… {formatDuration(seconds)}
                  </span>
                ) : (
                  "Tap to record the finding"
                )}
              </p>
              {micError && (
                <p className="mt-1 text-xs text-status-red">{micError}</p>
              )}
            </div>
          )}
        </div>

        {/* Optional notes */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          rows={1}
          className="mt-4 w-full resize-none rounded-2xl border-2 border-navy/10 bg-white px-4 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:border-navy/40 focus:outline-none"
        />

        {/* Save */}
        <button
          onClick={() =>
            canSave &&
            onSave({
              healthDimension: dimension,
              severity,
              photos,
              voiceRecording: voice,
              optionalNote: note.trim(),
            })
          }
          disabled={!canSave}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-navy text-base font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] disabled:opacity-40"
        >
          Save Finding
        </button>
      </div>
    </div>
  );
}
