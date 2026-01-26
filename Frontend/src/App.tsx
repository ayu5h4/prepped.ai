import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Mic, Video, Code, MessageSquare, StickyNote, Power, Send, User, Cpu } from 'lucide-react';
import './App.css';
import VoiceChat from './components/VoiceChat';

interface Message {
  role: 'user' | 'model';
  content: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'notes'>('chat');
  
  // Backend State
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice State
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'speaking'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  // Webcam Setup
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Webcam access denied:", err));
    }
  }, []);

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleStartInterview = async () => {
    if (!file || !jd) return alert("Upload Resume & JD first!");
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jd);

    try {
      await axios.post('http://localhost:8000/submit-context', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsContextLoaded(true);
      setMessages([{ role: 'model', content: "Hello! I've reviewed your profile. Ready to code?" }]);
    } catch (error) {
      alert("Backend connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setIsLoading(true);
    
    // Update UI
    const newHistory = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newHistory);

    try {
      // Backend Call
      const historyForBackend = newHistory.slice(0, -1).filter((m, i) => !(i === 0 && m.role === 'model'));
      const payload = { message: userMsg, history: historyForBackend };
      const response = await axios.post('http://localhost:8000/chat', payload);
      
      const { response: aiText, audio } = response.data;
      setMessages([...newHistory, { role: 'model', content: aiText }]);

      // Play Audio if available
      if (audio) {
        setAiState('speaking');
        const snd = new Audio("data:audio/mp3;base64," + audio);
        snd.play().then(() => {
          snd.onended = () => setAiState('idle');
        }).catch(e => console.error(e));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Hook Callbacks
  const handleUserVoiceMessage = (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setAiState('listening'); // User finished speaking, now processing
  };
  
  const handleAiVoiceResponse = (text: string) => {
    setMessages(prev => [...prev, { role: 'model', content: text }]);
  };

  return (
    <div className="app-layout">
      {/* 1. TOP NAVIGATION */}
      <nav className="top-nav">
        <div className="brand">
          <Cpu size={24} color="#2563eb" />
          Prepped.ai
        </div>
        <div className="status-badge">
          <div className="status-dot"></div>
          Live Interview
        </div>
      </nav>

      {/* 2. MAIN WORKSPACE */}
      <main className="workspace">
        
        {/* LEFT PANEL: TABS & CONTENT */}
        <div className="main-panel">
          <div className="tabs-header">
            <div className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
              <MessageSquare size={16} /> Chat
            </div>
            <div className={`tab ${activeTab === 'code' ? 'active' : ''}`} onClick={() => setActiveTab('code')}>
              <Code size={16} /> Code
            </div>
            <div className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
              <StickyNote size={16} /> Notes
            </div>
          </div>

          <div className="panel-content">
            {!isContextLoaded ? (
              <div style={{padding: '40px', textAlign: 'center'}}>
                <h2>Setup Interview Context</h2>
                <div style={{maxWidth: '400px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '15px'}}>
                   <input type="file" accept=".pdf" onChange={handleFileChange} />
                   <textarea rows={4} placeholder="Paste JD..." value={jd} onChange={e => setJd(e.target.value)} style={{padding: '10px'}}/>
                   <button onClick={handleStartInterview} style={{padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                     {isLoading ? "Loading..." : "Start Session"}
                   </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'chat' && (
                  <div className="chat-container">
                    <div className="messages-area">
                      {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                          <div className="avatar">{msg.role === 'user' ? <User size={16}/> : <Cpu size={16}/>}</div>
                          <div className="bubble">{msg.content}</div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="chat-input-area">
                      <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..." 
                      />
                      <button onClick={handleSendMessage}><Send size={18}/></button>
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <textarea className="code-editor" defaultValue="// Write your Python/JS code here...
def solution(args):
    pass
" />
                )}

                {activeTab === 'notes' && (
                  <textarea className="code-editor" style={{background: 'white', color: '#333', fontFamily: 'Inter'}} defaultValue="Candidate Notes:
- Key topic: System Design
- TODO: Review HashMaps" />
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: AI & VIDEO */}
        <aside className="side-panel">
          
          {/* AI INTERVIEWER WINDOW */}
          <div className="ai-feed">
            <div className="visualizer">
              {/* Only animate if speaking */}
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
            </div>
            <p style={{marginTop: '15px', color: '#64748b', fontSize: '0.9rem'}}>
              {aiState === 'speaking' ? "Speaking..." : "Listening..."}
            </p>
            
            {/* HIDDEN VOICE CONTROLS (Always active if Context Loaded) */}
            {isContextLoaded && (
               <div style={{position: 'absolute', bottom: '10px', opacity: 0.8}}>
                 <VoiceChat 
                   messages={messages} 
                   onSendMessage={handleUserVoiceMessage}
                   onAiResponse={handleAiVoiceResponse}
                 />
               </div>
            )}
          </div>

          {/* CANDIDATE CAMERA */}
          <div className="user-feed">
            <video ref={videoRef} autoPlay muted playsInline />
            <div style={{position: 'absolute', bottom: '10px', left: '10px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
              <Mic size={12} /> On
            </div>
          </div>

          {/* FOOTER ACTION */}
          <button className="end-session-btn" onClick={() => window.location.reload()}>
             <Power size={18} /> End Session
          </button>

        </aside>
      </main>
    </div>
  );
}

export default App;
