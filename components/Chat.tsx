
import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { db } from '../services/mockDb';

interface ChatProps {
  user: User;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [user.roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!user.roomId) return;
    const msgs = await db.getMessages(user.roomId);
    setMessages(msgs);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user.roomId) return;
    const sent = await db.addMessage(user.roomId, user.id, inputText);
    setInputText('');
    if (sent) loadMessages();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (user.roomId) {
            await db.addMessage(user.roomId, user.id, undefined, base64Audio);
            loadMessages();
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please enable microphone access to send voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] animate-fade-up">
      <div className="mb-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Collaboration</h2>
        <p className="text-slate-400 font-medium text-sm">Room internal discussion</p>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-2 p-1 px-2 mt-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
            <i className="fas fa-comment-dots text-6xl mb-4 text-green-500"></i>
            <p className="font-bold text-slate-800">Room discussion is empty</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'} animate-scale-in`}
              style={{animationDelay: `${i * 0.05}s`}}
            >
              <div className="flex items-center gap-2 mb-1.5 px-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName}</span>
                <span className="text-[9px] text-slate-300 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`max-w-[85%] px-4 py-3 rounded-[1.8rem] shadow-sm border ${
                msg.senderId === user.id 
                  ? 'bg-green-500 text-white border-green-400 rounded-tr-none' 
                  : 'bg-white text-slate-800 border-gray-100 rounded-tl-none'
              }`}>
                {msg.type === 'audio' ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.senderId === user.id ? 'bg-white/20' : 'bg-green-50 text-green-500'}`}>
                      <i className="fas fa-play text-sm"></i>
                    </div>
                    <audio controls className={`h-8 w-44 brightness-95 ${msg.senderId === user.id ? 'invert' : ''}`} src={msg.audioData} />
                  </div>
                ) : (
                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="relative mt-auto pt-4 px-1 pb-2">
        {isRecording && (
          <div className="absolute -top-12 left-4 right-4 bg-red-50 text-red-500 px-6 py-3 rounded-2xl flex justify-between items-center animate-fade-up shadow-lg border border-red-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-widest">Recording... {formatDuration(recordingDuration)}</span>
            </div>
            <button onClick={stopRecording} className="text-[10px] font-black underline uppercase tracking-widest">Cancel / Stop</button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={isRecording ? "Stop to send voice..." : "Send a message..."}
              disabled={isRecording}
              className="w-full bg-white border border-gray-100 rounded-[2.2rem] px-6 py-5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 pr-14 font-medium shadow-sm transition-all text-sm"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isRecording}
              className="absolute right-2 top-2 bottom-2 w-12 bg-slate-900 rounded-full flex items-center justify-center text-white hover:bg-green-500 transition-all btn-bounce disabled:opacity-20"
            >
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          </div>
          
          <button 
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md btn-bounce ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-lg`}></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
