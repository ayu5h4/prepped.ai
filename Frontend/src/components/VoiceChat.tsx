import React, { useEffect, useState } from 'react';
import { useWebSpeech } from '../hooks/useWebSpeech';
import axios from 'axios';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface VoiceChatProps {
  onSendMessage: (msg: string) => void; // Adds user text to chat
  onAiResponse: (msg: string) => void;  // Adds AI text to chat
  messages: Message[];
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onSendMessage, onAiResponse, messages }) => {
  const { isListening, transcript, startListening, setTranscript } = useWebSpeech();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  // When transcript updates (user stops talking), send it automatically
  useEffect(() => {
    if (transcript && !isListening) {
      handleSend(transcript);
    }
  }, [transcript, isListening]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    
    // 1. Add User Message to UI (via parent)
    onSendMessage(text);

    try {
      // 2. Prepare Payload (History + Message)
      // Filter out the "fake" welcome message so backend doesn't crash
      const historyForBackend = messages.filter((msg, index) => {
          return !(index === 0 && msg.role === 'model');
      });

      const payload = {
        message: text,
        history: historyForBackend
      };

      // 3. Call Backend
      const response = await axios.post('http://localhost:8000/chat', payload);
      
      const { response: aiText, audio } = response.data;

      // 4. Add AI Message to UI (via parent)
      onAiResponse(aiText);

      // 5. Play Audio
      if (audio) {
        setStatus('speaking');
        const snd = new Audio(`data:audio/mp3;base64,${audio}`);
        snd.play();
        snd.onended = () => {
          setStatus('idle');
          setTranscript(''); // Clear transcript after successful turn
        };
      } else {
        setStatus('idle');
        setTranscript('');
      }

    } catch (error) {
      console.error("Voice Chat Error:", error);
      setStatus('idle');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '12px', marginTop: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h3>🎤 Voice Interface</h3>
      
      <div style={{ fontSize: '1.5rem', margin: '20px 0', minHeight: '40px' }}>
        {status === 'idle' && <span style={{color: '#666'}}>💤 Ready</span>}
        {status === 'listening' && <span style={{color: '#dc3545'}}>🔴 Listening...</span>}
        {status === 'processing' && <span style={{color: '#ffc107'}}>🧠 Thinking...</span>}
        {status === 'speaking' && <span style={{color: '#28a745'}}>🟢 Speaking...</span>}
      </div>

      <button 
        onClick={startListening} 
        disabled={status !== 'idle'}
        style={{
          padding: '15px 30px',
          fontSize: '1.2rem',
          borderRadius: '50px',
          background: status === 'listening' ? '#dc3545' : '#007bff',
          color: 'white',
          border: 'none',
          cursor: status === 'idle' ? 'pointer' : 'not-allowed',
          transition: 'transform 0.1s'
        }}
      >
        {status === 'listening' ? "Stop Speaking" : "Push to Speak"}
      </button>

      {transcript && <p style={{fontStyle: 'italic', color: '#666', marginTop: '10px'}}>You said: "{transcript}"</p>}
    </div>
  );
};

export default VoiceChat;
