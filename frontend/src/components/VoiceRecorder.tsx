import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

interface VoiceRecorderProps {
  context: 'search' | 'listing' | 'assistant';
  onTranscribed: (text: string) => void;
  language?: string;            // optional; omit for auto-detect
  size?: 'sm' | 'md';
  title?: string;
}

/**
 * Mic button that records audio via MediaRecorder and POSTs it to
 * /api/voice/transcribe. Calls onTranscribed(text) on success.
 */
export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  context,
  onTranscribed,
  language,
  size = 'md',
  title,
}) => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = handleStop;
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      console.error('Mic error', err);
      toast.error('Microphone access denied. Please allow and try again.');
    }
  };

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  };

  const handleStop = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (blob.size < 500) {
      toast.error('Recording too short. Hold the mic and speak.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      const params = new URLSearchParams({ context });
      if (language) params.append('language', language);
      const res = await fetch(`${API_URL}/api/voice/transcribe?${params.toString()}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error((await res.text()) || 'Transcription failed');
      const data = await res.json();
      const text = (data.text || '').trim();
      if (!text) {
        toast.error('Could not hear anything. Please try again.');
      } else {
        onTranscribed(text);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Voice transcription failed');
    } finally {
      setLoading(false);
    }
  };

  const dims = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (loading) {
    return (
      <button
        type="button"
        disabled
        data-testid={`voice-${context}-loading`}
        className={`${dims} rounded-full bg-ink-700 border border-ink-600 flex items-center justify-center`}
        title="Transcribing…"
      >
        <Loader2 className={`${iconSize} text-gold-400 animate-spin`} />
      </button>
    );
  }

  if (recording) {
    return (
      <button
        type="button"
        onClick={stop}
        data-testid={`voice-${context}-stop-btn`}
        className={`${dims} rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse`}
        title={`Recording ${elapsed}s — tap to stop`}
      >
        <Square className={`${iconSize} text-white fill-white`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      data-testid={`voice-${context}-start-btn`}
      className={`${dims} rounded-full bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 flex items-center justify-center transition-colors`}
      title={title || 'Tap to speak'}
    >
      <Mic className={`${iconSize} text-gold-400`} />
    </button>
  );
};

export default VoiceRecorder;
