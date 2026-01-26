import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import VoiceChat from './components/VoiceChat';

interface Message {
  role: 'user' | 'model';
  content: string;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleStartInterview = async () => {
    if (!file || !jd) {
      alert("Please upload a resume and enter a Job Description.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jd);

    try {
      await axios.post('http://localhost:8000/submit-context', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsContextLoaded(true);
      setMessages([{ role: 'model', content: "Welcome to Prepped.ai. I have reviewed your profile. Let's begin." }]);
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- TEXT CHAT HANDLER ---
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setIsLoading(true);

    const newHistory = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newHistory);

    try {
      // Filter out fake greeting for backend
      const historyForBackend = newHistory.slice(0, -1).filter((msg, index) => {
        if (index === 0 && msg.role === 'model') return false;
        return true;
      });

      const payload = { message: userMsg, history: historyForBackend };
      
      // Note: Text endpoint returns { response: "text", audio: "base64" }
      // We ignore audio here for text-only mode, or you can play it if you want.
      const response = await axios.post('http://localhost:8000/chat', payload);
      
      const aiMsg = response.data.response;
      setMessages([...newHistory, { role: 'model', content: aiMsg }]);
    } catch (error) {
      console.error(error);
      setMessages([...newHistory, { role: 'model', content: "Error connecting to Prepped.ai interviewer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CALLBACKS FOR VOICE CHAT ---
  // 1. When user speaks, add their text to UI immediately
  const handleUserVoiceMessage = (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
  };

  // 2. When AI responds (audio + text), add AI text to UI
  const handleAiVoiceResponse = (text: string) => {
    setMessages(prev => [...prev, { role: 'model', content: text }]);
  };

  const handleEndInterview = async () => {
    if (!window.confirm("Are you sure you want to end the interview and get feedback?")) return;
    
    setIsLoading(true);
    try {
        const historyForBackend = messages.filter((msg, index) => {
            if (index === 0 && msg.role === 'model') return false;
            return true;
        });

        const response = await axios.post('http://localhost:8000/feedback', { history: historyForBackend });
        setFeedback(response.data.feedback);
    } catch (error) {
        console.error(error);
        alert("Failed to generate feedback.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Prepped.ai 🚀</h1>
        <p>Voice-Enabled AI Interview Coach</p>
      </header>

      {/* VIEW 1: SETUP */}
      {!isContextLoaded && !feedback && (
        <div className="setup-card">
          <h2>1. Setup Interview</h2>
          <div className="input-group">
            <label>Upload Resume (PDF)</label>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
          </div>
          <div className="input-group">
            <label>Job Description</label>
            <textarea 
              rows={6} 
              placeholder="Paste Job Description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>
          <button onClick={handleStartInterview} disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Start Interview"}
          </button>
        </div>
      )}

      {/* VIEW 2: CHAT INTERFACE */}
      {isContextLoaded && !feedback && (
        <div className="chat-interface">
          <div className="chat-window">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="bubble">{msg.content}</div>
              </div>
            ))}
            {isLoading && <div className="message model"><div className="bubble typing">...</div></div>}
            <div ref={messagesEndRef} />
          </div>
          
          {/* VOICE CHAT COMPONENT */}
          <VoiceChat 
            messages={messages} 
            onSendMessage={handleUserVoiceMessage} 
            onAiResponse={handleAiVoiceResponse}
          />

          <div className="input-area">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your answer or use Voice..."
            />
            <button onClick={handleSendMessage} disabled={isLoading}>Send Text</button>
          </div>
          
          <button className="end-btn" onClick={handleEndInterview} disabled={isLoading} style={{marginTop: '10px', background: '#dc3545'}}>
             End Interview & Get Feedback
          </button>
        </div>
      )}

      {/* VIEW 3: FEEDBACK */}
      {feedback && (
        <div className="feedback-card">
            <h2>Interview Feedback</h2>
            <div className="feedback-content">
                <pre>{feedback}</pre>
            </div>
            <button onClick={() => window.location.reload()}>Start New Interview</button>
        </div>
      )}
    </div>
  );
}

export default App;