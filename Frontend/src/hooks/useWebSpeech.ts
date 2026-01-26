import { useState, useEffect, useRef } from 'react';

// TypeScript definition for the Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

export const useWebSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const { webkitSpeechRecognition } = window as unknown as IWindow;
    if (!webkitSpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false; // Stop after one sentence/phrase
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript(''); // Clear previous input
      recognitionRef.current.start();
    } else {
        alert("Voice recognition not supported in this browser (try Chrome/Edge).");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return { isListening, transcript, startListening, stopListening, setTranscript };
};