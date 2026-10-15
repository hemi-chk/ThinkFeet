// Minimal typings for the Web Speech API, which isn't in every TS DOM lib.
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionCtor = new () => Recognition;

const HAND_BACK = [/table topics? master/, /over to you/];

/**
 * Listens for the speaker handing control back ("...back to you, Table Topics Master")
 * and calls `onHandBack`. Returns a stop function, or null if speech recognition is unsupported.
 */
export function listenForHandBack(onHandBack: () => void): (() => void) | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!SR) return null;

  try {
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    let active = true;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = String(e.results[i][0].transcript)
          .toLowerCase()
          .replace(/[^a-z\s]/g, " ")
          .replace(/\s+/g, " ");
        if (HAND_BACK.some((re) => re.test(txt))) onHandBack();
      }
    };
    // Browsers end recognition after silence; keep it alive until we stop it.
    r.onend = () => {
      if (!active) return;
      try {
        r.start();
      } catch {
        /* already started */
      }
    };
    r.start();
    return () => {
      active = false;
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
    };
  } catch {
    return null;
  }
}
