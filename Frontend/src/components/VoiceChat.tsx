import React, { useEffect, useState } from 'react';
import { useWebSpeech } from '../hooks/useWebSpeech';
import axios from 'axios';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface VoiceChatProps {
  onSendMessage: (msg: string) => void;
  onAiResponse: (msg: string) => void;
  messages: Message[];
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onSendMessage, onAiResponse, messages }) => {
  const { isListening, transcript, startListening, setTranscript } = useWebSpeech();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  useEffect(() => {
    if (transcript && !isListening) handleSend(transcript);
  }, [transcript, isListening]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setStatus('processing');
    onSendMessage(text);

    try {
      const historyForBackend = messages.filter((m, i) => !(i === 0 && m.role === 'model'));
      const payload = { message: text, history: historyForBackend };
      const res = await axios.post('http://localhost:8000/chat', payload);
      const { response: aiText, audio } = res.data;
      onAiResponse(aiText);

      if (audio) {
        setStatus('speaking');
        const snd = new Audio(`data:audio/mp3;base64,${audio}`);
        snd.play();
        snd.onended = () => setStatus('idle');
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Voice Chat Error:', err);
      setStatus('idle');
    }
  };

  return (
    <div className="voice-chat-card">
      <h3>🎤 Voice Interface</h3>

      <div className="voice-status" style={{ margin: '14px 0', minHeight: 28 }}>
        {status === 'idle' && <span className="muted">💤 Ready</span>}
        {status === 'listening' && <span className="listening">🔴 Listening...</span>}
        {status === 'processing' && <span className="processing">🧠 Thinking...</span>}
        {status === 'speaking' && <span className="speaking">🟢 Speaking...</span>}
      </div>

      <button
        className={`voice-button ${status === 'listening' ? 'pulse' : ''}`}
        onClick={() => {
          if (isListening) {
            setTranscript('');
          } else {
            startListening();
          }
        }}
        disabled={status !== 'idle' && status !== 'listening'}
      >
        {status === 'listening' ? 'Stop' : 'Push to Speak'}
      </button>

      {transcript && <p className="voice-transcript">You said: "{transcript}"</p>}
    </div>
  );
};

export default VoiceChat;
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
      return (
        <div style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '12px', marginTop: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
          <h3>🎤 Voice Interface</h3>
      
          <div style={{ fontSize: '1.25rem', margin: '18px 0', minHeight: '36px' }}>
            {status === 'idle' && <span style={{color: '#666'}}>💤 Ready</span>}
            {status === 'listening' && <span style={{color: '#dc3545'}}>🔴 Listening...</span>}
            {status === 'processing' && <span style={{color: '#ff9f1c'}}>🧠 Thinking...</span>}
            {status === 'speaking' && <span style={{color: '#28a745'}}>🟢 Speaking...</span>}
          </div>

          <motion.button 
            onClick={startListening} 
            disabled={status !== 'idle'}
            whileTap={{ scale: 0.96 }}
            animate={status === 'listening' ? { boxShadow: '0 0 30px rgba(220,53,69,0.3)', scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.9, repeat: status === 'listening' ? Infinity : 0 }}
            style={{
              padding: '14px 28px',
              fontSize: '1.05rem',
              borderRadius: '999px',
              background: status === 'listening' ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              cursor: status === 'idle' ? 'pointer' : 'not-allowed',
            }}
          >
            {status === 'listening' ? "Stop" : "Push to Speak"}
          </motion.button>

          {transcript && <p style={{fontStyle: 'italic', color: '#666', marginTop: '10px'}}>You said: "{transcript}"</p>}
        </div>
      );
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
