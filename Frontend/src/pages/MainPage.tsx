import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Mic, MicOff, Code, MessageSquare, StickyNote, Power, Send, User as UserIcon, Cpu, Sun, Moon, Monitor, Pen, Eraser, Square, Circle, Type, Download, Trash2, Play, Undo } from 'lucide-react';
import '../App.css';
import Auth from '../components/Auth';
import ProfileMenu from '../components/ProfileMenu';
import { auth, googleProvider, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';

interface Message {
  id?: string;
  role: 'user' | 'model';
  content: string;
  timestamp?: any;
  user: string;
}

type Theme = 'light' | 'dark' | 'system';
type DrawTool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

function MainPage() {
  const [user, setUser] = useState<User | null>(null);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  // Inside your App component
  // Inside your App component
  const [pendingText, setPendingText] = useState('');
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);


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
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  
  // Voice State - Updated
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [isMicActive, setIsMicActive] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Cooldown Timer Effect
  useEffect(() => {
    if (isCoolingDown && cooldownTimer > 0) {
      const timer = setTimeout(() => {
        setCooldownTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldownTimer === 0) {
      setIsCoolingDown(false);
    }
  }, [isCoolingDown, cooldownTimer]);


  // Canvas State - Updated with history & monochrome default
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#000000'); // Changed default from blue to black
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const snapshotRef = useRef<ImageData | null>(null);

  // Code Editor State
  const [codeContent, setCodeContent] = useState(() => {
    const saved = localStorage.getItem('prepped-code');
    return saved !== null ? saved : ''; 
  });
  const [codeOutput, setCodeOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },  // Request Widescreen
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.777 } // 16:9 Aspect Ratio
        } 
      })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => console.error("Webcam access denied:", err));
    }
  }, []);
  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }

    const onTheme = (e: Event) => {
      const t = (e as CustomEvent).detail as Theme | undefined;
      if (t) setTheme(t);
    };
    window.addEventListener('theme-changed', onTheme as EventListener);
    return () => window.removeEventListener('theme-changed', onTheme as EventListener);
  }, [theme]);

  // Adjust draw color when theme changes if it's still default
  useEffect(() => {
     const currentTheme = document.documentElement.getAttribute('data-theme');
     if (currentTheme === 'dark' && drawColor === '#000000') {
         setDrawColor('#ffffff');
     } else if (currentTheme === 'light' && drawColor === '#ffffff') {
         setDrawColor('#000000');
     }
  }, [theme]);

  // Canvas Setup
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
          
          if (canvasHistory.length === 0) {
            saveCanvasState();
          }
        }
      }
    }
  }, [activeTab]);

  // Resize canvas
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

  useEffect(() => {
    localStorage.setItem('prepped-code', codeContent);
  }, [codeContent]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'messages'), orderBy('timestamp'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(messages);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Webcam access denied:", err));
    }
  }, []);
  useEffect(() => {
  if (!isTyping) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsTyping(false);
      saveCanvasState(); // Commit the text
    } else if (e.key === 'Escape') {
      setIsTyping(false);
      undoCanvas(); // Cancel typing
      } else if (e.key === 'Backspace') {
        setPendingText(prev => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        setPendingText(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping]);
  // Inside your component, use a useEffect to redraw when pendingText changes
useEffect(() => {
  if (!isTyping || !canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Restore the canvas from the last snapshot before drawing the preview
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    // Draw the Preview Text
    ctx.font = `${strokeWidth * 8}px Inter`;
    ctx.fillStyle = drawColor;
    ctx.fillText(pendingText + (isTyping ? '|' : ''), textPos.x, textPos.y);
  };
  img.src = canvasHistory[historyStep];
}, [pendingText, isTyping]);

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
        console.log('Audio recorded:', audioBlob);
        setAiState('listening');
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

  // Canvas History
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

  // Canvas Drawing with Preview
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });

    if (drawTool === 'rectangle' || drawTool === 'circle') {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = drawColor;
    ctx.fillStyle = drawColor;
    ctx.lineWidth = drawTool === 'eraser' ? strokeWidth * 3 : strokeWidth;
    ctx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
    
    ctx.beginPath();
    if (drawTool === 'pen' || drawTool === 'eraser') {
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
    } else if (drawTool === 'rectangle' || drawTool === 'circle') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      
      ctx.beginPath();
      if (drawTool === 'rectangle') {
        const width = x - startPos.x;
        const height = y - startPos.y;
        ctx.rect(startPos.x, startPos.y, width, height);
      } else if (drawTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      }
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

  if (drawTool === 'text') {
    setTextPos({ x: startPos.x, y: startPos.y });
    setIsTyping(true);
    setPendingText(''); // Clear previous text
  } else if (drawTool === 'rectangle' || drawTool === 'circle') {
    // ... existing shape logic ...
  }

  setIsDrawing(false);
  saveCanvasState();
};

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
      const initialMessage = { role: 'model', content: "Hello! I've reviewed your profile. Ready to code?", timestamp: serverTimestamp(), user: user!.uid };
      await addDoc(collection(db, 'messages'), initialMessage);
    } catch (error) {
      alert("Backend connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || isCoolingDown) return;
    const userMsg = input;
    setInput('');
    setIsLoading(true);
    
    if (user) {
      await addDoc(collection(db, 'messages'), {
        content: userMsg,
        role: 'user',
        timestamp: serverTimestamp(),
        user: user.uid
      });
    }
    const newHistory = [...messages, { role: 'user', content: userMsg, user: user!.uid }];

    try {
      const historyForBackend = newHistory.slice(0, -1).filter((m, i) => !(i === 0 && m.role === 'model'));
      const payload = { message: userMsg, history: historyForBackend };
      const response = await axios.post('http://localhost:8000/chat', payload);
      
      const { response: aiText, audio } = response.data;
      if (user) {
        await addDoc(collection(db, 'messages'), {
          content: aiText,
          role: 'model',
          timestamp: serverTimestamp(),
          user: user.uid
        });
      }

      if (audio) {
        setAiState('speaking');
        const snd = new Audio("data:audio/mp3;base64," + audio);
        snd.play().then(() => {
          snd.onended = () => setAiState('idle');
        }).catch(e => console.error(e));
      }
    } catch (error) {
      console.error(error);
      // Optional: Show an error message to the user in the chat
      if (user) {
        await addDoc(collection(db, 'messages'), {
          content: "Sorry, I couldn't process that. The API might be busy. Please try again in a moment.",
          role: 'model',
          timestamp: serverTimestamp(),
          user: user.uid
        });
      }
    } finally {
      setIsLoading(false);
      // Start cooldown
      setIsCoolingDown(true);
      setCooldownTimer(5); // 5 seconds
    }
  };

  const executeCode = async () => {
    if (!codeContent.trim()) {
      setCodeOutput('⚠️ Please write some code first!');
      return;
    }

    localStorage.setItem('prepped-code', codeContent);
    setIsExecuting(true);
    setCodeOutput('⏳ Running code...\n');
    
    try {
      const isPython = codeContent.includes('def ') || (!codeContent.includes('console.log') && !codeContent.includes('function'));
      const language = isPython ? 'python' : 'javascript';
      
      const payload = { code: codeContent, language: language };
      const response = await axios.post('http://localhost:8000/execute-code', payload, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      const { success, output, error } = response.data;
      if (success) {
        setCodeOutput(`✅ Execution successful!\n\nOutput:\n${output}${error ? `\n\n⚠️ Warnings:\n${error}` : ''}`);
      } else {
        setCodeOutput(`❌ Execution failed!\n\n${error || 'Unknown error'}${output ? `\n\nPartial Output:\n${output}` : ''}`);
      }
    } catch (error: any) {
      setCodeOutput(`❌ Error: ${error.message || 'Unknown error'}`);
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
          <Cpu size={24} /> {/* Removed hardcoded color */}
          Prepped.ai
        </div>
        
        <div className="nav-actions">
          <ProfileMenu />
        </div>
      </nav>

      {/* 2. MAIN WORKSPACE */}
      {user ? (
        <main className="workspace">
          <div className="main-panel">
            <div className="tabs-header">
              <div
                className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={16} /> Chat
              </div>
              <div
                className={`tab ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
              >
                <Code size={16} /> Code
              </div>
              <div
                className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <StickyNote size={16} /> Notes
              </div>
            </div>

            <div className="panel-content">
              {!isContextLoaded ? (
                <div className="setup-container">
                  <div className="setup-card">
                    <h2>Setup Interview Context</h2>
                    <div className="setup-form">
                      <div className="file-input-wrapper">
                        <label
                          htmlFor="resume-upload"
                          className="glass-button secondary"
                        >
                          <Download size={16} />{' '}
                          {file ? file.name : 'Upload Resume (PDF)'}
                        </label>
                        <input
                          id="resume-upload"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </div>

                      <textarea
                        rows={4}
                        placeholder="Paste Job Description..."
                        value={jd}
                        onChange={(e) => setJd(e.target.value)}
                        className="glass-textarea"
                      />

                      <button
                        onClick={handleStartInterview}
                        className="glass-button primary"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="loader"></div>
                        ) : (
                          <>
                            Ready to Start <Play size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // ...
                <>
                  {activeTab === 'chat' && (
                    <div className="chat-container">
                      <div className="messages-area">
                        {messages.map((msg, i) => (
                          <div key={i} className={`message ${msg.role}`}>
                            <div className="avatar">
                              {msg.role === 'user' ? (
                                <UserIcon size={16} />
                              ) : (
                                <Cpu size={16} />
                              )}
                            </div>
                            <div className="bubble">{msg.content}</div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="chat-input-area">
                        <div className="chat-input-wrapper">
                          <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === 'Enter' && handleSendMessage()
                            }
                            placeholder={isCoolingDown ? `Please wait ${cooldownTimer}s...` : "Type a message..."}
                            disabled={isLoading || isCoolingDown}
                          />
                          <button onClick={handleSendMessage} disabled={isLoading || isCoolingDown}>
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'code' && (
                    <div className="code-editor-container">
                      <div className="code-editor-header">
                        <div
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                          }}
                        >
                          Code Editor
                        </div>
                        <div className="code-editor-actions">
                          <button
                            className="theme-toggle-btn"
                            onClick={() =>
                              setCodeTheme(
                                codeTheme === 'dark' ? 'light' : 'dark'
                              )
                            }
                            title={
                              codeTheme === 'dark'
                                ? 'Switch to Light Mode'
                                : 'Switch to Dark Mode'
                            }
                          >
                            {codeTheme === 'dark' ? (
                              <Moon size={16} />
                            ) : (
                              <Sun size={16} />
                            )}
                          </button>
                          <button
                            className="execute-btn"
                            onClick={executeCode}
                            disabled={isExecuting}
                          >
                            <Play size={16} />{' '}
                            {isExecuting ? 'Running...' : 'Run Code'}
                          </button>
                        </div>
                      </div>

                      <textarea
                        className={`code-editor ${codeTheme}`}
                        value={codeContent}
                        onChange={(e) => setCodeContent(e.target.value)}
                        placeholder="# Start coding here..."
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
                          <button
                            className={`tool-btn ${
                              drawTool === 'pen' ? 'active' : ''
                            }`}
                            onClick={() => setDrawTool('pen')}
                            title="Pen"
                          >
                            <Pen size={16} />
                          </button>
                          <button
                            className={`tool-btn ${
                              drawTool === 'eraser' ? 'active' : ''
                            }`}
                            onClick={() => setDrawTool('eraser')}
                            title="Eraser"
                          >
                            <Eraser size={16} />
                          </button>
                          <button
                            className={`tool-btn ${
                              drawTool === 'rectangle' ? 'active' : ''
                            }`}
                            onClick={() => setDrawTool('rectangle')}
                            title="Rectangle"
                          >
                            <Square size={16} />
                          </button>
                          <button
                            className={`tool-btn ${
                              drawTool === 'circle' ? 'active' : ''
                            }`}
                            onClick={() => setDrawTool('circle')}
                            title="Circle"
                          >
                            <Circle size={16} />
                          </button>
                          <button
                            className={`tool-btn ${
                              drawTool === 'text' ? 'active' : ''
                            }`}
                            onClick={() => setDrawTool('text')}
                            title="Text"
                          >
                            <Type size={16} />
                          </button>
                        </div>

                        <input
                          type="color"
                          value={drawColor}
                          onChange={(e) => setDrawColor(e.target.value)}
                          className="color-picker"
                          title="Color"
                        />

                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={strokeWidth}
                          onChange={(e) =>
                            setStrokeWidth(Number(e.target.value))
                          }
                          className="stroke-width"
                          title={`Stroke Width: ${strokeWidth}px`}
                        />

                        <div
                          className="tool-group"
                          style={{ marginLeft: 'auto' }}
                        >
                          <button
                            className="tool-btn"
                            onClick={undoCanvas}
                            disabled={historyStep <= 0}
                            title="Undo"
                          >
                            <Undo size={16} />
                          </button>
                          <button
                            className="tool-btn"
                            onClick={downloadCanvas}
                            title="Save as PNG"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="tool-btn"
                            onClick={clearCanvas}
                            title="Clear Canvas"
                          >
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
                            cursor:
                              drawTool === 'pen'
                                ? 'crosshair'
                                : drawTool === 'eraser'
                                ? 'cell'
                                : drawTool === 'text'
                                ? 'text'
                                : 'default',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <aside className="side-panel">
            <div className="ai-feed">
              <div className="visualizer">
                <div
                  className="bar"
                  style={{
                    animationPlayState:
                      aiState === 'speaking' ? 'running' : 'paused',
                  }}
                ></div>
                <div
                  className="bar"
                  style={{
                    animationPlayState:
                      aiState === 'speaking' ? 'running' : 'paused',
                  }}
                ></div>
                <div
                  className="bar"
                  style={{
                    animationPlayState:
                      aiState === 'speaking' ? 'running' : 'paused',
                  }}
                ></div>
                <div
                  className="bar"
                  style={{
                    animationPlayState:
                      aiState === 'speaking' ? 'running' : 'paused',
                  }}
                ></div>
                <div
                  className="bar"
                  style={{
                    animationPlayState:
                      aiState === 'speaking' ? 'running' : 'paused',
                  }}
                ></div>
              </div>
              <p
                style={{
                  marginTop: '15px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                }}
              >
                {aiState === 'speaking'
                  ? 'AI Speaking...'
                  : aiState === 'listening'
                  ? 'Processing...'
                  : 'Ready'}
              </p>
            </div>

            <div className="user-feed">
              <video ref={videoRef} autoPlay muted playsInline />
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

            <button
              className="end-session-btn"
              onClick={() => window.location.reload()}
            >
              <Power size={18} /> End Session
            </button>
          </aside>
        </main>
      ) : (
        <div className="login-prompt">
          <h2>Welcome to Prepped.ai</h2>
          <p>Sign in to start your mock interview.</p>
          <Auth user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />
        </div>
      )}
    </div>
  );
}

export default MainPage;
