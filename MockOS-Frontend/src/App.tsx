import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

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
      // FAKE INITIAL MESSAGE (For UI Only)
      setMessages([{ role: 'model', content: "I have reviewed your resume. I am ready to begin. Please introduce yourself." }]);
    } catch (error) {
      console.error(error);
      alert("Failed to upload context. Check backend terminal for errors.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setIsLoading(true);

    // 1. Update UI (Show User Message)
    const newHistory = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newHistory);

    try {
      // 2. Filter History for Backend
      // We MUST remove the first message if it is the fake AI greeting.
      // Gemini will CRASH if history starts with 'model'.
      const historyForBackend = newHistory.slice(0, -1).filter((msg, index) => {
        const isFirstMessage = index === 0;
        const isModel = msg.role === 'model';
        // If it's the first message AND it's from the model, it's our fake greeting. SKIP IT.
        if (isFirstMessage && isModel) return false;
        return true;
      });

      const payload = {
        message: userMsg,
        history: historyForBackend
      };

      const response = await axios.post('http://localhost:8000/chat', payload);
      
      const aiMsg = response.data.response;
      setMessages([...newHistory, { role: 'model', content: aiMsg }]);

    } catch (error) {
      console.error(error);
      setMessages([...newHistory, { role: 'model', content: "⚠️ Error: Connection to Interviewer failed. Check backend console." }]);
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
        <h1>Prepped.ai 🤖</h1>
      </header>

      {!isContextLoaded ? (
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
            {isLoading ? "Uploading..." : "Start Interview"}
          </button>
        </div>
      ) : (
        <div className="chat-interface">
          <div className="chat-window">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && <div className="message model"><div className="bubble typing">...</div></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your answer..."
            />
            <button onClick={handleSendMessage} disabled={isLoading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;