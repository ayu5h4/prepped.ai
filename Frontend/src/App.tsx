import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Mic, MicOff, Code, MessageSquare, StickyNote, Power, Send, User, Cpu, Sun, Moon, Monitor, Pen, Eraser, Square, Circle, Type, Download, Trash2, Play, Undo } from 'lucide-react';
import './App.css';
import VoiceChat from './components/VoiceChat';

interface Message {
  role: 'user' | 'model';
  content: string;
}

type Theme = 'light' | 'dark' | 'system';
type DrawTool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'notes'>('chat');
  const [theme, setTheme] = useState<Theme>('system');
  const [codeTheme, setCodeTheme] = useState<'dark' | 'light'>('dark');
  
  // Backend State
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice State - Updated
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [isMicActive, setIsMicActive] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Canvas State - Updated with history
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  // Code Editor State - Empty on first load, then persist
  const [codeContent, setCodeContent] = useState(() => {
    const saved = localStorage.getItem('prepped-code');
    return saved !== null ? saved : ''; // Empty string on first load
  });
  const [codeOutput, setCodeOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Canvas Setup - Updated with history
  useEffect(() => {
    if (canvasRef.current && activeTab === 'notes') {
      const canvas = canvasRef.current;
      const wrapper = canvas.parentElement;
      if (wrapper) {
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Save initial blank state
          if (canvasHistory.length === 0) {
            saveCanvasState();
          }
        }
      }
    }
  }, [activeTab]);

  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && activeTab === 'notes') {
        const canvas = canvasRef.current;
        const wrapper = canvas.parentElement;
        if (wrapper) {
          const imageData = canvas.toDataURL();
          canvas.width = wrapper.clientWidth;
          canvas.height = wrapper.clientHeight;
          
          const img = new Image();
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
          };
          img.src = imageData;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Save code to localStorage on change
  useEffect(() => {
    localStorage.setItem('prepped-code', codeContent);
  }, [codeContent]);

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

  // --- Voice Recording Setup ---
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // TODO: Send to backend for speech-to-text
        // For now, just log
        console.log('Audio recorded:', audioBlob);
        setAiState('listening');
        
        // Simulate sending to backend
        // You'll need to implement /voice-to-text endpoint
        setTimeout(() => setAiState('idle'), 1000);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsMicActive(true);
      setAiState('listening');
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsMicActive(false);
    }
  };

  const toggleMic = () => {
    if (isMicActive) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Canvas History Management
  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL();
    const newHistory = canvasHistory.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setCanvasHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undoCanvas = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = canvasHistory[newStep];
    }
  };

  // Canvas Drawing Handlers - Updated
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });

    ctx.strokeStyle = drawColor;
    ctx.fillStyle = drawColor;
    ctx.lineWidth = drawTool === 'eraser' ? strokeWidth * 3 : strokeWidth;
    ctx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
    
    if (drawTool === 'pen' || drawTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawTool === 'pen' || drawTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawTool === 'rectangle') {
      const width = x - startPos.x;
      const height = y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (drawTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (drawTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        ctx.font = `${strokeWidth * 8}px Inter`;
        ctx.fillText(text, startPos.x, startPos.y);
      }
    }

    setIsDrawing(false);
    saveCanvasState(); // Save after each drawing action
  };

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

  // Code Execution Handler - Real backend execution with better error handling
  const executeCode = async () => {
    if (!codeContent.trim()) {
      setCodeOutput('⚠️ Please write some code first!');
      return;
    }

    localStorage.setItem('prepped-code', codeContent);
    setIsExecuting(true);
    setCodeOutput('⏳ Running code...\n');
    
    try {
      // Detect language
      const isPython = codeContent.includes('def ') || 
                       codeContent.includes('print(') || 
                       codeContent.includes('import ') ||
                       codeContent.includes('class ') ||
                       codeContent.trim().startsWith('#') ||
                       (!codeContent.includes('console.log') && !codeContent.includes('function'));
      
      const language = isPython ? 'python' : 'javascript';
      
      console.log('='.repeat(50));
      console.log('Executing code...');
      console.log('Language:', language);
      console.log('Code:', codeContent.substring(0, 100) + '...');
      console.log('='.repeat(50));
      
      const payload = {
        code: codeContent,
        language: language
      };
      
      console.log('Sending request to:', 'http://localhost:8000/execute-code');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      // Call backend
      const response = await axios.post('http://localhost:8000/execute-code', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      if (response.status === 404) {
        setCodeOutput(`❌ Endpoint Not Found (404)!\n\nThe backend server is running but /execute-code endpoint is missing.\n\nPlease:\n1. Stop the backend (Ctrl+C)\n2. Make sure you have the latest main.py\n3. Restart: python main.py\n4. Visit http://localhost:8000/docs to verify endpoint exists`);
        return;
      }
      
      const { success, output, error } = response.data;
      
      if (success) {
        setCodeOutput(`✅ Execution successful!\n\nOutput:\n${output}${error ? `\n\n⚠️ Warnings:\n${error}` : ''}`);
      } else {
        setCodeOutput(`❌ Execution failed!\n\n${error || 'Unknown error'}${output ? `\n\nPartial Output:\n${output}` : ''}`);
      }
      
    } catch (error: any) {
      console.error('Code execution error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setCodeOutput(`❌ Cannot Connect to Backend!\n\n🔴 Backend server is not running.\n\nSteps to fix:\n1. Open terminal in Backend folder\n2. Run: python main.py\n3. Wait for "Server running at: http://localhost:8000"\n4. Try running code again`);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setCodeOutput(`❌ Request Timeout!\n\nCode execution took too long (>10 seconds).\nCheck for infinite loops or heavy computations.`);
      } else if (error.response?.status === 404) {
        setCodeOutput(`❌ Endpoint Not Found (404)!\n\nDEBUG INFO:\nURL: ${error.config?.url}\nMethod: ${error.config?.method}\n\nThe /execute-code endpoint doesn't exist.\n\n✅ Verify at: http://localhost:8000/docs\n✅ Or test: http://localhost:8000/health`);
      } else {
        setCodeOutput(`❌ Error: ${error.response?.data?.detail || error.message || 'Unknown error'}\n\nStatus: ${error.response?.status || 'No response'}\n\nCheck browser console (F12) for details.`);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveCanvasState();
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'interview-notes.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="app-layout">
      {/* 1. TOP NAVIGATION */}
      <nav className="top-nav">
        <div className="brand">
          <Cpu size={24} color="#2563eb" />
          Prepped.ai
        </div>
        
        <div className="nav-actions">
          <div className="theme-switcher">
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`} 
              onClick={() => setTheme('light')}
              title="Light Mode"
            >
              <Sun size={18} />
            </button>
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} 
              onClick={() => setTheme('dark')}
              title="Dark Mode"
            >
              <Moon size={18} />
            </button>
            <button 
              className={`theme-btn ${theme === 'system' ? 'active' : ''}`} 
              onClick={() => setTheme('system')}
              title="System Theme"
            >
              <Monitor size={18} />
            </button>
          </div>
          
          <div className="status-badge">
            <div className="status-dot"></div>
            Live Interview
          </div>
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
                  <div className="code-editor-container">
                    <div className="code-editor-header">
                      <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500}}>
                        Code Editor
                      </div>
                      <div className="code-editor-actions">
                        <button
                          className="theme-toggle-btn"
                          onClick={() => setCodeTheme(codeTheme === 'dark' ? 'light' : 'dark')}
                          title={codeTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                          {codeTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <button 
                          className="execute-btn" 
                          onClick={executeCode}
                          disabled={isExecuting}
                        >
                          <Play size={16} /> {isExecuting ? 'Running...' : 'Run Code'}
                        </button>
                      </div>
                    </div>
                    
                    <textarea 
                      className={`code-editor ${codeTheme}`}
                      value={codeContent}
                      onChange={e => setCodeContent(e.target.value)}
                      placeholder="# Start coding here...\n\n# Python example:\nprint('Hello, World!')\n\n# JavaScript example:\nconsole.log('Hello, World!');"
                      spellCheck={false}
                    />
                    
                    {codeOutput && (
                      <div className={`code-output ${codeTheme}`}>
                        {codeOutput}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="notes-container">
                    <div className="canvas-toolbar">
                      <div className="tool-group">
                        <button className={`tool-btn ${drawTool === 'pen' ? 'active' : ''}`} onClick={() => setDrawTool('pen')} title="Pen">
                          <Pen size={16} />
                        </button>
                        <button className={`tool-btn ${drawTool === 'eraser' ? 'active' : ''}`} onClick={() => setDrawTool('eraser')} title="Eraser">
                          <Eraser size={16} />
                        </button>
                        <button className={`tool-btn ${drawTool === 'rectangle' ? 'active' : ''}`} onClick={() => setDrawTool('rectangle')} title="Rectangle">
                          <Square size={16} />
                        </button>
                        <button className={`tool-btn ${drawTool === 'circle' ? 'active' : ''}`} onClick={() => setDrawTool('circle')} title="Circle">
                          <Circle size={16} />
                        </button>
                        <button className={`tool-btn ${drawTool === 'text' ? 'active' : ''}`} onClick={() => setDrawTool('text')} title="Text">
                          <Type size={16} />
                        </button>
                      </div>
                      
                      <input 
                        type="color" 
                        value={drawColor} 
                        onChange={e => setDrawColor(e.target.value)}
                        className="color-picker"
                        title="Color"
                      />
                      
                      <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        value={strokeWidth}
                        onChange={e => setStrokeWidth(Number(e.target.value))}
                        className="stroke-width"
                        title={`Stroke Width: ${strokeWidth}px`}
                      />
                      
                      <div className="tool-group" style={{marginLeft: 'auto'}}>
                        <button 
                          className="tool-btn" 
                          onClick={undoCanvas} 
                          disabled={historyStep <= 0}
                          title="Undo"
                        >
                          <Undo size={16} />
                        </button>
                        <button className="tool-btn" onClick={downloadCanvas} title="Save as PNG">
                          <Download size={16} />
                        </button>
                        <button className="tool-btn" onClick={clearCanvas} title="Clear Canvas">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="canvas-wrapper">
                      <canvas 
                        ref={canvasRef}
                        className="drawing-canvas"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        style={{
                          cursor: drawTool === 'pen' ? 'crosshair' : 
                                 drawTool === 'eraser' ? 'cell' : 
                                 drawTool === 'text' ? 'text' : 'default'
                        }}
                      />
                    </div>
                  </div>
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
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
              <div className="bar" style={{animationPlayState: aiState === 'speaking' ? 'running' : 'paused'}}></div>
            </div>
            <p style={{marginTop: '15px', color: '#64748b', fontSize: '0.9rem'}}>
              {aiState === 'speaking' ? "AI Speaking..." : aiState === 'listening' ? "Processing..." : "Ready"}
            </p>
          </div>

          {/* CANDIDATE CAMERA */}
          <div className="user-feed">
            <video ref={videoRef} autoPlay muted playsInline />
            
            {/* Mic Toggle Button */}
            {isContextLoaded && (
              <button 
                className={`mic-toggle ${isMicActive ? 'active' : 'muted'}`}
                onClick={toggleMic}
                title={isMicActive ? 'Stop Recording' : 'Start Recording'}
              >
                {isMicActive ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
            )}
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
