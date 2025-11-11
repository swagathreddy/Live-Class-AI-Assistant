import React, { useState, useRef, useEffect } from 'react';
import {
    Mic, MicOff, Monitor, MonitorOff, Square, Play, FileText, MessageSquare, Download,
    Clock, BookOpen, CheckCircle, AlertCircle, RefreshCw, Video, Zap, LogOut
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface RecordingState {
    isRecording: boolean;
    audioEnabled: boolean;
    screenEnabled: boolean;
    duration: number;
}

interface ClassSession {
    _id: string;
    name: string;
    date: string;
    duration: number;
    status: 'recording' | 'completed' | 'processing' | 'failed';
    files?: {
        audio?: { filename: string };
        video?: { filename: string };
    };
    processing?: {
        transcript?: { text: string };
        summary?: { text: string; keyPoints: string[]; assignments: string[] };
    };
}

// --- HELPER FUNCTION ---
const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// --- AUTHENTICATION COMPONENT ---
function AuthComponent({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const API_BASE_URL = 'http://localhost:5000';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
        const payload = isLoginView ? { email, password } : { name, email, password };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'An error occurred.');
            }
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                onLoginSuccess();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="w-full max-w-md p-8 space-y-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">Live Class AI Assistant</h1>
                    <p className="text-slate-400">{isLoginView ? 'Welcome back!' : 'Create your account'}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginView && (
                        <div>
                            <label className="text-sm font-medium text-slate-300">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 mt-1 bg-slate-800/50 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-300">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2 mt-1 bg-slate-800/50 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 bg-slate-800/50 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full py-3 font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50">
                        {loading ? 'Loading...' : (isLoginView ? 'Login' : 'Register')}
                    </button>
                </form>
                <p className="text-sm text-center text-slate-400">
                    {isLoginView ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-medium text-emerald-400 hover:underline">
                        {isLoginView ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
}

// --- RESULTS VIEW COMPONENT ---
function ResultsView({ 
    session,
    onProcessAI,
    apiBaseUrl,
    getToken
}: { 
    session: ClassSession | null,
    onProcessAI: (sessionId: string) => void,
    apiBaseUrl: string,
    getToken: () => string | null 
}) {
    if (!session) { return <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-12 text-center"><FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" /><h3 className="text-xl font-bold text-white mb-2">No Session Selected</h3><p className="text-slate-400">Please select a session from the History tab.</p></div>; }
    const showProcessingButton = (session.status === 'completed' || session.status === 'failed') && !session.processing?.transcript;
    return (<div className="space-y-6"><div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-white">{session.name}</h2><p className="text-slate-400">{new Date(session.date).toLocaleDateString()} • {formatDuration(session.duration)}</p></div></div></div>{session.files?.video && (<div className="bg-black rounded-2xl border border-white/10 overflow-hidden"><video key={session._id} controls src={`${apiBaseUrl}/api/upload/stream/${session._id}/video?token=${getToken()}`} className="w-full" /></div>)}{showProcessingButton && (<div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10"><h3 className="text-xl font-bold text-white mb-4">Ready for AI Analysis</h3><p className="text-slate-400 mb-6">Click the button below to generate a transcript and summary.</p><button onClick={() => onProcessAI(session._id)} className="flex items-center justify-center mx-auto space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"><Zap className="w-5 h-5" /><span>Start AI Processing</span></button></div>)}{session.status === 'processing' && (<div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10"><div className="flex items-center justify-center space-x-3 text-yellow-400"><Clock className="w-6 h-6 animate-spin" /><h3 className="text-xl font-bold">AI processing in progress...</h3></div><p className="text-slate-400 mt-4">Please check back in a few minutes.</p></div>)}{session.processing?.transcript && (<><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"><h3 className="text-xl font-bold text-white mb-4">Key Points</h3><ul className="space-y-2">{(session.processing.summary?.keyPoints?.length || 0) > 0 ? session.processing.summary!.keyPoints.map((point, index) => (<li key={index} className="flex items-start space-x-2 text-slate-300"><CheckCircle className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" /><span>{point}</span></li>)) : <p className="text-slate-400">No key points identified.</p>}</ul></div><div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"><h3 className="text-xl font-bold text-white mb-4">Assignments</h3><ul className="space-y-2">{(session.processing.summary?.assignments?.length || 0) > 0 ? session.processing.summary!.assignments.map((assignment, index) => (<li key={index} className="flex items-start space-x-2 text-slate-300"><AlertCircle className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" /><span>{assignment}</span></li>)) : <p className="text-slate-400">No assignments mentioned.</p>}</ul></div></div><div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"><h3 className="text-xl font-bold text-white mb-4">AI Summary</h3><p className="text-slate-300 leading-relaxed">{session.processing.summary?.text}</p></div><div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"><h3 className="text-xl font-bold text-white mb-4">Full Transcript</h3><div className="max-h-64 overflow-y-auto p-4 bg-slate-800/30 rounded-lg"><p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{session.processing.transcript.text}</p></div></div></>)}</div>);
}


// --- MAIN APP COMPONENT ---
function App() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('authToken'));
    const [recordingState, setRecordingState] = useState<RecordingState>({ isRecording: false, audioEnabled: true, screenEnabled: false, duration: 0 });
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'record' | 'history' | 'results'>('record');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const API_BASE_URL = 'http://localhost:5000';
    const getToken = (): string | null => localStorage.getItem('authToken');

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setSessions([]);
        setSelectedSession(null);
        setActiveTab('record');
    };

    const fetchSessions = async () => {
        setIsFetchingHistory(true);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/api/sessions`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch sessions');
            const data = await response.json();
            setSessions(data.sessions);
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setIsFetchingHistory(false);
        }
    };

    const uploadRecording = async (blob: Blob, sessionId: string, fileType: 'audio' | 'video') => {
        if (!sessionId) return;
        const formData = new FormData();
        formData.append(fileType, blob, `recording.webm`);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/api/upload/${fileType}/${sessionId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'File upload failed.');
            }
            alert('Recording complete and saved!');
            fetchSessions();
        } catch (error: any) {
            alert(`Failed to upload recording: ${error.message}`);
        }
    };

    const startRecording = async () => {
        try {
            const token = getToken();
            if (!token) { alert("You must be logged in to start a recording."); return; }
            const sessionResponse = await fetch(`${API_BASE_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: `Class Recording - ${new Date().toLocaleString()}`, status: 'recording' })
            });
            if (!sessionResponse.ok) throw new Error('Failed to create a session on the server.');
            const newSession = await sessionResponse.json();
            
            const micStream = recordingState.audioEnabled ? await navigator.mediaDevices.getUserMedia({ audio: true }) : null;
            const displayStream = recordingState.screenEnabled ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) : null;
            audioStreamRef.current = micStream;
            screenStreamRef.current = displayStream;

            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const destination = audioContext.createMediaStreamDestination();
            if (micStream?.getAudioTracks().length) audioContext.createMediaStreamSource(micStream).connect(destination);
            if (displayStream?.getAudioTracks().length) audioContext.createMediaStreamSource(displayStream).connect(destination);

            const combinedStream = new MediaStream([...(displayStream?.getVideoTracks() || []), ...destination.stream.getAudioTracks()]);
            const isVideo = recordingState.screenEnabled;
            const mimeType = isVideo ? 'video/webm; codecs=vp8,opus' : 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) { alert(`Browser does not support ${mimeType}`); return; }

            const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            const recordedChunks: Blob[] = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: mimeType });
                uploadRecording(blob, newSession._id, isVideo ? 'video' : 'audio');
            };
            mediaRecorder.start(1000);
            setRecordingState(prev => ({ ...prev, isRecording: true, duration: 0 }));
            intervalRef.current = setInterval(() => setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 })), 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Failed to start recording. Please check your browser permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        [audioStreamRef, screenStreamRef].forEach(ref => ref.current?.getTracks().forEach(track => track.stop()));
        if (audioContextRef.current?.state !== 'closed') audioContextRef.current.close();
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRecordingState(prev => ({ ...prev, isRecording: false }));
    };

    const handleProcessAI = async (sessionId: string) => {
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/api/ai/process/${sessionId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to start AI processing.');
            alert('AI processing has started! Check the History tab in a few minutes for the updated status.');
            
            setSelectedSession(prev => prev ? { ...prev, status: 'processing' } : null);
            setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, status: 'processing' } : s));
        } catch (error: any) {
            alert(error.message);
        }
    };

    const viewSessionDetails = (session: ClassSession) => {
        setSelectedSession(session);
        setActiveTab('results');
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchSessions();
        }
    }, [isAuthenticated]);
    
    if (!isAuthenticated) {
        return <AuthComponent onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-emerald-500/20 rounded-lg"><BookOpen className="w-6 h-6 text-emerald-400" /></div>
                           <div><h1 className="text-xl font-bold text-white">Live Class AI Assistant</h1><p className="text-slate-400 text-sm">Smart note-taking and summarization</p></div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex bg-slate-800/50 rounded-lg p-1">
                                {(['record', 'history', 'results'] as const).map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === tab ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>))}
                            </div>
                            <button onClick={handleLogout} className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors" title="Logout">
                                <LogOut className="w-4 h-4" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'record' && (
                     <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Class Recording</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <div className="space-y-6">
                               <div className="space-y-4">
                                   <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"><div className="flex items-center space-x-3"><Mic className="w-5 h-5 text-emerald-400" /><span className="text-white font-medium">Audio Recording</span></div><button onClick={() => setRecordingState(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }))} className={`p-2 rounded-lg transition-all duration-200 ${recordingState.audioEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}`}>{recordingState.audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}</button></div>
                                   <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"><div className="flex items-center space-x-3"><Monitor className="w-5 h-5 text-blue-400" /><span className="text-white font-medium">Screen Capture</span></div><button onClick={() => setRecordingState(prev => ({ ...prev, screenEnabled: !prev.screenEnabled }))} className={`p-2 rounded-lg transition-all duration-200 ${recordingState.screenEnabled ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}`}>{recordingState.screenEnabled ? <Monitor className="w-4 h-4" /> : <MonitorOff className="w-4 h-4" />}</button></div>
                               </div>
                               <button onClick={recordingState.isRecording ? stopRecording : startRecording} disabled={!recordingState.audioEnabled && !recordingState.screenEnabled} className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-3 ${recordingState.isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-600 disabled:text-slate-400'}`}>{recordingState.isRecording ? (<><Square className="w-5 h-5" /><span>Stop Recording</span></>) : (<><Play className="w-5 h-5" /><span>Start Recording</span></>)}</button>
                           </div>
                           <div className="space-y-4">
                               <div className="p-6 bg-slate-800/30 rounded-lg border border-slate-700"><div className="flex items-center justify-between mb-4"><span className="text-slate-400">Recording Status</span>{recordingState.isRecording && (<div className="flex items-center space-x-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div><span className="text-red-400 text-sm">Live</span></div>)}</div><div className="space-y-3"><div className="flex justify-between"><span className="text-white">Duration</span><span className="text-emerald-400 font-mono text-lg">{formatDuration(recordingState.duration)}</span></div><div className="flex justify-between"><span className="text-white">Audio</span><span className={recordingState.audioEnabled ? 'text-emerald-400' : 'text-slate-400'}>{recordingState.audioEnabled ? 'Enabled' : 'Disabled'}</span></div><div className="flex justify-between"><span className="text-white">Screen</span><span className={recordingState.screenEnabled ? 'text-blue-400' : 'text-slate-400'}>{recordingState.screenEnabled ? 'Enabled' : 'Disabled'}</span></div></div></div>
                               <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700"><h4 className="text-white font-medium mb-2">Instructions</h4><ul className="text-slate-400 text-sm space-y-1"><li>• Join your class on Google Meet, Zoom, etc.</li><li>• Enable audio recording to capture lecture content</li><li>• Optionally enable screen capture for slides</li><li>• Click "Start Recording" when class begins</li></ul></div>
                           </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'history' && (
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Class History</h2>
                            <button onClick={fetchSessions} disabled={isFetchingHistory} className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50">
                                <RefreshCw className={`w-4 h-4 ${isFetchingHistory ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            {sessions.length > 0 ? sessions.map((session) => (
                                <div key={session._id} onClick={() => viewSessionDetails(session)} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700 hover:bg-slate-800/50 transition-all duration-200 cursor-pointer">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-emerald-500/20 rounded-lg"><FileText className="w-6 h-6 text-emerald-400" /></div>
                                        <div>
                                            <h3 className="text-white font-semibold">{session.name}</h3>
                                            <div className="flex items-center space-x-4 text-sm text-slate-400">
                                                <span>{new Date(session.date).toLocaleDateString()}</span>
                                                <span>{formatDuration(session.duration)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${session.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : session.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {session.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                            {session.status === 'processing' && <Clock className="w-3 h-3 animate-spin" />}
                                            {session.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                                            <span className="capitalize">{session.status}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : <p className="text-slate-400 text-center py-8">No recordings found. Make your first recording!</p>}
                        </div>
                    </div>
                )}
                
                {activeTab === 'results' && (
                    <ResultsView 
                        session={selectedSession}
                        onProcessAI={handleProcessAI}
                        apiBaseUrl={API_BASE_URL}
                        getToken={getToken}
                    />
                )}
            </main>
        </div>
    );
}

export default App;