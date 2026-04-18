import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Activity, User, Bot, BookOpen, Beaker, PlusCircle, MessageSquare, Trash2 } from 'lucide-react'; // <-- Trash2 import kiya

export default function App() {
  const [sessionId, setSessionId] = useState('');
  const [diseaseContext, setDiseaseContext] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [sessionList, setSessionList] = useState([]);
  const [activeResearch, setActiveResearch] = useState({ trials: [], pubs: [] });
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessionList();
    startNewPatient();
  }, []);

  const fetchSessionList = async () => {
    try {
      const res = await axios.get('https://curalink2-0.onrender.com/api/sessions');
      setSessionList(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => scrollToBottom(), [messages]);

  const startNewPatient = () => {
    setSessionId(`session_${Math.random().toString(36).substring(2, 9)}`);
    setDiseaseContext('');
    setMessages([]);
    setActiveResearch({ trials: [], pubs: [] });
  };

  const loadSession = async (id, disease) => {
    setLoading(true);
    try {
     const res = await axios.get(`https://curalink2-0.onrender.com/api/sessions/${id}`);
      setSessionId(id);
      setDiseaseContext(disease);
      setMessages(res.data.messages);
      setActiveResearch({ trials: [], pubs: [] }); 
    } catch (err) {
      console.error("Failed to load chat", err);
    } finally {
      setLoading(false);
    }
  };

  // --- NAYA FUNCTION: Delete Chat ---
  const deleteSession = async (e, id) => {
    e.stopPropagation(); // Yeh isliye taaki delete dabane par chat load na ho jaye
    try {
     await axios.delete(`https://curalink2-0.onrender.com/api/sessions/${id}`);
      
      // UI se turant hata do
      setSessionList(prev => prev.filter(s => s.sessionId !== id));
      
      // Agar active chat hi delete kar di, toh naya fresh page khol do
      if (sessionId === id) {
        startNewPatient();
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const isFirstMessage = messages.length === 0;
    const userMsg = { role: 'user', content: input };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('https://curalink2-0.onrender.com/api/research', {
        sessionId: sessionId,
        disease: isFirstMessage ? input : "", 
        userQuery: input
      });

      const data = response.data;
      if (isFirstMessage && data.disease) {
        setDiseaseContext(data.disease);
        fetchSessionList(); 
      }

      const aiMsg = { role: 'assistant', content: data.results.aiSummary };
      setMessages((prev) => [...prev, aiMsg]);
      
      setActiveResearch({
        trials: data.results.clinicalTrials || [],
        pubs: data.results.publications || []
      });

    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "⚠️ Error connecting to server." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* COLUMN 1: LEFT SIDEBAR */}
      <div className="w-64 bg-slate-900 text-white flex flex-col z-20 shrink-0 shadow-xl">
        <div className="p-5 flex items-center gap-2 mb-2">
          <Activity size={28} className="text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">Curalink<span className="text-blue-400">.</span></h1>
        </div>
        
        <div className="px-4 mb-6">
          <button onClick={startNewPatient} className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-medium transition shadow-sm">
            <PlusCircle size={18} /> New Patient
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Consultations</p>
          {sessionList.map((session) => (
            // NAYA: Hover karne par delete button dikhega (group class use ki hai)
            <div 
              key={session.sessionId} 
              className={`group flex items-center justify-between px-3 py-3 rounded-lg transition cursor-pointer ${sessionId === session.sessionId ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              onClick={() => loadSession(session.sessionId, session.diseaseContext)}
            >
              <div className="flex items-center gap-3 truncate">
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate text-sm font-medium">
                  {session.diseaseContext || "General Query"}
                </span>
              </div>
              
              <button 
                onClick={(e) => deleteSession(e, session.sessionId)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 hover:bg-slate-700 rounded transition"
                title="Delete Chat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMN 2: MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-white border-r border-slate-200">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <Bot size={56} className="text-blue-600 mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">How can I assist today?</h2>
              <p className="text-slate-500">Enter a disease or symptom to begin generating a clinical report.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                  <Bot size={18} />
                </div>
              )}
              <div className={`max-w-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm p-4' : 'w-full'}`}>
                <div className={`${msg.role === 'assistant' ? 'prose prose-slate max-w-none text-[15px] leading-relaxed bg-white border border-slate-200 p-6 rounded-2xl shadow-sm' : 'text-[15px]'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4 justify-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-1"><Bot size={18} /></div>
              <div className="bg-white border border-slate-200 py-3 px-5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                 <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                 <div className="text-slate-500 text-sm font-medium">Analyzing medical databases...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-100">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3 relative">
            <input 
              type="text" 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full pl-6 pr-14 py-4 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              placeholder="Message Curalink..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition disabled:opacity-50 shadow-sm">
              <Send size={18} className="ml-1" />
            </button>
          </form>
        </div>
      </div>

      {/* COLUMN 3: RIGHT PANEL (Research Sources) */}
      <div className="w-80 lg:w-96 bg-slate-50 flex flex-col shrink-0 overflow-hidden shadow-inner hidden lg:flex">
        <div className="p-5 border-b border-slate-200 bg-white">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Context</p>
          <h2 className="text-lg font-bold text-brand-dark truncate">{diseaseContext || "Awaiting Context..."}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeResearch.trials.length === 0 && activeResearch.pubs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
              <BookOpen size={48} className="mb-3 opacity-30" />
              <p className="text-sm text-center px-4">Research sources will appear here when a query is processed.</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-8">
              
              {/* Trials Section */}
              {activeResearch.trials.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><Beaker size={18} className="text-green-600"/> Clinical Trials</h3>
                  <div className="space-y-3">
                    {activeResearch.trials.map((trial, i) => (
                      <a key={i} href={trial.url} target="_blank" rel="noreferrer" className="block bg-white p-4 rounded-xl border border-slate-200 hover:border-green-400 transition shadow-sm group">
                        <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{trial.status}</span>
                        <h4 className="font-semibold text-sm mt-2 text-slate-800 line-clamp-2 group-hover:text-blue-600">{trial.title}</h4>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Pubs Section */}
              {activeResearch.pubs.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><BookOpen size={18} className="text-blue-600"/> Publications</h3>
                  <div className="space-y-3">
                    {activeResearch.pubs.map((pub, i) => (
                      <a key={i} href={pub.url} target="_blank" rel="noreferrer" className="block bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition shadow-sm group">
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{pub.source}</span>
                        <h4 className="font-semibold text-sm mt-2 text-slate-800 line-clamp-2 group-hover:text-blue-600">{pub.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1">By {pub.authors}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}