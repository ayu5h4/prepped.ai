import { useState, useEffect, useRef } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

export const useWebSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Ref to keep track of the actual instance
  const recognitionRef = useRef<any>(null);
  // Ref to track state immediately without waiting for React re-renders
  const isBusyRef = useRef(false);

  useEffect(() => {
    const { webkitSpeechRecognition } = window as unknown as IWindow;
    if (!webkitSpeechRecognition) {
      setError("Browser not supported. Use Chrome or Edge.");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false; // Stop after one sentence
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setIsListening(true);
        isBusyRef.current = true;
        setError(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
        setIsListening(false);
        isBusyRef.current = false;
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition warning:", event.error);
      setIsListening(false);
      isBusyRef.current = false;
      
      // Ignore trivial errors
      if (event.error === 'no-speech') {
        return; 
      }
      if (event.error === 'network') {
        setError("Network error. Check connection.");
      } else if (event.error === 'not-allowed') {
        setError("Microphone blocked.");
      }
    };

    recognitionRef.current = recognition;
    
    // Cleanup on unmount
    return () => {
        if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const startListening = () => {
    // CRITICAL FIX: Check if already busy to prevent "InvalidStateError"
    if (isBusyRef.current || !recognitionRef.current) return;

    setTranscript('');
    setError(null);
    
    try {
        recognitionRef.current.start();
    } catch (e) {
        console.error("Start error (safely ignored):", e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return { isListening, transcript, error, startListening, stopListening, setTranscript };
};