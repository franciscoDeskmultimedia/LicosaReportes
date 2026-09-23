'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Building2,
  Database,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Square,
} from 'lucide-react';
import { getChatAvailableProjects, ChatProjectOption } from '@/lib/ai/actions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsExecuted?: string[];
  timestamp: string;
}

const TOOL_FRIENDLY_NAMES: Record<string, string> = {
  getSystemSummary: 'Resumen Global Consolidado',
  listUserProjects: 'Listado de Obras',
  getProjectOverview: 'Resumen Ejecutivo & Financiero',
  getRubrosProgress: 'Planillaje de Rubros',
  getDailyReportsSummary: 'Reportes Diarios de Obra',
  getMaterialInventory: 'Inventario de Bodega',
  getMachineryStatus: 'Parque de Maquinaria',
  getWorkRequestsSummary: 'Solicitudes de Materiales',
};

const SUGGESTED_PROMPTS = [
  {
    title: 'Avance General',
    prompt: '¿Cuál es el avance físico y financiero acumulado de la obra y cómo vamos con el cronograma?',
    icon: '📊',
  },
  {
    title: 'Rubros Críticos',
    prompt: '¿Cuáles son los rubros que superan el 80% o están con sobreejecución?',
    icon: '🏗️',
  },
  {
    title: 'Bodega & Stock',
    prompt: '¿Tenemos materiales con alertas de stock bajo en bodega?',
    icon: '📦',
  },
  {
    title: 'Último Reporte',
    prompt: '¿Qué novedades u observaciones hubo en el último reporte diario oficial?',
    icon: '📝',
  },
];

/**
 * Limpia texto de markdown para lectura por voz natural (TTS)
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\|[^\n]+\|/g, '') // Elimina tablas
    .replace(/[#*`_>~]/g, '')   // Elimina markdown
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Enlaces a texto plano
    .replace(/\n+/g, '. ')
    .trim();
}

/**
 * Formateador de Markdown a HTML seguro y limpio
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const [header, separator, ...body] = tableRows;
    const headers = header ? header.map((h) => h.trim()) : [];
    tableRows = [];
    inTable = false;

    return (
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full text-xs text-left text-slate-700">
          <thead className="bg-slate-100 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-blue-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        // separador
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      elements.push(flushTable(index));
    }

    if (!trimmed) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={index} className="font-semibold text-slate-900 text-sm mt-3 mb-1 flex items-center gap-1.5">
          {formatInline(trimmed.replace('### ', ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={index} className="font-bold text-slate-900 text-base mt-3 mb-1.5">
          {formatInline(trimmed.replace('## ', ''))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(trimmed.replace(/^[-*]\s+/, ''))}
        </li>
      );
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      elements.push(
        <div key={index} className="ml-4 text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(trimmed)}
        </div>
      );
      return;
    }

    elements.push(
      <p key={index} className="text-xs text-slate-700 leading-relaxed my-1">
        {formatInline(trimmed)}
      </p>
    );
  });

  if (inTable) {
    elements.push(flushTable(lines.length));
  }

  return <div className="space-y-1">{elements}</div>;
}

export function AiChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [projects, setProjects] = useState<ChatProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Voz y Conversación Natural
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [conversationalMode, setConversationalMode] = useState(false); // Modo Manos Libres continuo
  const [recordTimer, setRecordTimer] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationalModeRef = useRef(conversationalMode);

  // VAD (Voice Activity Detection / Detector de silencio automático)
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    conversationalModeRef.current = conversationalMode;
  }, [conversationalMode]);

  // Cargar proyectos disponibles al montar
  useEffect(() => {
    getChatAvailableProjects().then((data) => {
      setProjects(data);
      if (data.length > 0 && selectedProjectId === 'ALL') {
        setSelectedProjectId(data[0].id);
      }
    });
  }, []);

  // Auto-scroll al recibir o enviar mensajes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Detener voz al cerrar
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      stopRecording();
    }
  }, [isOpen]);

  // Manejo de Reproducción de Voz (Text-to-Speech)
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!voiceOutputEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    window.speechSynthesis.cancel();
    const clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05; // Ritmo fluido y natural

    // Buscar una voz en español de calidad si está disponible
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice =
      voices.find((v) => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Paulina') || v.name.includes('Mónica'))) ||
      voices.find((v) => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Inicio de Grabación de Micrófono con Detector de Silencio (VAD)
  const startRecording = async () => {
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await handleAudioTranscription(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordTimer(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordTimer((t) => t + 1);
      }, 1000);

      // --- DETECTOR AUTOMÁTICO DE SILENCIO (VAD) PARA MODO CONVERSACIONAL ---
      if (conversationalModeRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let userStartedSpeaking = false;
            let silenceStart: number | null = null;
            const SILENCE_TIMEOUT_MS = 1400; // 1.4 segundos de silencio tras hablar
            const VOLUME_THRESHOLD = 16;     // Umbral de volumen para detectar voz

            vadIntervalRef.current = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const averageVolume = sum / bufferLength;

              if (averageVolume > VOLUME_THRESHOLD) {
                userStartedSpeaking = true;
                silenceStart = null;
              } else if (userStartedSpeaking) {
                // El usuario estaba hablando y ahora guardó silencio
                if (!silenceStart) {
                  silenceStart = Date.now();
                } else if (Date.now() - silenceStart >= SILENCE_TIMEOUT_MS) {
                  // Silencio detectado: Detener y enviar automáticamente
                  if (vadIntervalRef.current) {
                    clearInterval(vadIntervalRef.current);
                    vadIntervalRef.current = null;
                  }
                  stopRecording();
                }
              }
            }, 100);
          }
        } catch (vadError) {
          console.warn('VAD no soportado en este navegador:', vadError);
        }
      }
    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor verifica los permisos en tu navegador.');
    }
  };

  const stopRecording = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Transcribir audio grabado con Groq Whisper
  const handleAudioTranscription = async (blob: Blob) => {
    if (blob.size < 100) return; // Audio vacío

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio-record.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al transcribir audio');
      }

      const data = await res.json();
      const transcribedText = data.text?.trim();

      if (transcribedText) {
        // Enviar inmediatamente la pregunta transcrita
        handleSendMessage(transcribedText);
      }
    } catch (error: any) {
      console.error('Error de transcripción:', error);
      alert('Error al transcribir el audio: ' + (error.message || 'Intenta de nuevo'));
    } finally {
      setIsTranscribing(false);
    }
  };

  // Envío de Mensaje al Copilot
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    stopSpeaking();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor (${response.status})`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        toolsExecuted: data.toolsExecuted || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Si la voz está activada, leer la respuesta
      speakText(data.text, () => {
        // Si el "Modo Conversación Fluida / Manos Libres" está activo, reanudar escucha automáticamente para diálogo continuo
        if (conversationalModeRef.current) {
          setTimeout(() => {
            startRecording();
          }, 800);
        }
      });
    } catch (error: any) {
      console.error('Error al consultar Copilot:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Ocurrió un inconveniente:**\n${error.message || 'No pude conectar con el servicio de IA. Verifica tu conexión o intenta en unos momentos.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([]);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Botón Flotante (Siempre visible) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-4 py-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 group border border-blue-400/30"
          aria-label="Abrir asistente de IA"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-100 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide">LICOSA Copilot</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase flex items-center gap-1">
            <Mic className="h-2.5 w-2.5" /> Voz & Chat
          </span>
        </button>
      )}

      {/* Ventana de Chat Flotante / Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'w-[95vw] md:w-[720px] h-[86vh]'
              : 'w-[92vw] sm:w-[470px] h-[610px] max-h-[86vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/30 text-blue-300 border border-blue-400/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight">LICOSA Copilot</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                  {isSpeaking && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-cyan-200 animate-pulse border border-cyan-400/40">
                      <Volume2 className="h-3 w-3" /> Hablando...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300">Asistente de obra con voz en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              {/* Botón Silenciar/Escuchar voz */}
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setVoiceOutputEnabled(!voiceOutputEnabled);
                }}
                title={voiceOutputEnabled ? 'Voz activada (clic para silenciar)' : 'Voz silenciada (clic para activar)'}
                className={`rounded-lg p-1.5 transition-colors ${
                  voiceOutputEnabled ? 'text-cyan-300 bg-white/10' : 'text-slate-400 hover:bg-white/10'
                }`}
              >
                {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Limpiar conversación"
                  className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Tamaño normal' : 'Expandir'}
                className="hidden sm:block rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition-colors"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar"
                className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Barra de Controles: Selector de Obra + Toggle Modo Conversacional */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100/90 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs rounded-md border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">🌐 Todas las obras (resumen global)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Modo Manos Libres / Conversación continua */}
            <button
              onClick={() => {
                const nextMode = !conversationalMode;
                setConversationalMode(nextMode);
                if (nextMode) {
                  if (!isRecording && !isLoading && !isSpeaking) {
                    startRecording();
                  }
                } else {
                  stopRecording();
                  stopSpeaking();
                }
              }}
              title="Permite hablar y pausar de forma continua sin tocar la pantalla"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                conversationalMode
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Radio className={`h-3 w-3 ${conversationalMode ? 'animate-pulse text-white' : 'text-slate-400'}`} />
              <span>{conversationalMode ? '🎙️ Manos Libres: ACTIVO' : 'Manos Libres: OFF'}</span>
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Asistente de Obra por Voz o Texto
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
                  En **Modo Manos Libres**, solo habla. La IA detecta cuando guardas silencio (~1.5s), envía la pregunta, te responde por voz y vuelve a escucharte.
                </p>

                {/* Preguntas sugeridas */}
                <div className="w-full grid grid-cols-1 gap-2 text-left">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-xs transition-all text-xs text-slate-700"
                    >
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900 block group-hover:text-blue-600">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {item.prompt}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Badge de herramientas consultadas */}
                    {message.role === 'assistant' && (
                      <div className="mb-2 flex items-center justify-between gap-1 pb-1.5 border-b border-slate-100">
                        <div className="flex flex-wrap gap-1 items-center">
                          <Database className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-400 font-medium">Fuentes:</span>
                          {message.toolsExecuted && message.toolsExecuted.length > 0 ? (
                            message.toolsExecuted.map((tName, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] text-slate-600 font-mono"
                              >
                                {TOOL_FRIENDLY_NAMES[tName] || tName}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Resumen de Obra</span>
                          )}
                        </div>

                        {/* Botón Escuchar este mensaje */}
                        <button
                          onClick={() => speakText(message.content)}
                          title="Escuchar respuesta"
                          className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Contenido del mensaje */}
                    {message.role === 'user' ? (
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {message.timestamp}
                  </span>
                </div>
              ))
            )}

            {/* Banner de Estado de Grabación en vivo */}
            {isRecording && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>
                    {conversationalMode
                      ? `Escuchando (${formatTimer(recordTimer)})... Pausa de hablar y responderá solo`
                      : `Escuchando tu voz (${formatTimer(recordTimer)})...`}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium hover:bg-red-700 flex items-center gap-1 shadow-xs"
                >
                  <Square className="h-3 w-3" /> Enviar ahora
                </button>
              </div>
            )}

            {/* Banner de Transcripción con Whisper */}
            {isTranscribing && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Transcribiendo audio con Groq Whisper en tiempo real...</span>
              </div>
            )}

            {/* Indicador de Consultando DB y Generando */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="rounded-2xl rounded-bl-xs bg-white border border-slate-200 px-4 py-3 shadow-xs flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-600 font-medium animate-pulse">
                    Consultando datos y formulando respuesta...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              {/* Botón de Micrófono / Grabación */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isTranscribing}
                className={`ml-2 p-2 rounded-lg transition-all ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse shadow-md'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={isRecording ? 'Detener y enviar pregunta' : 'Hablar por micrófono (Whisper IA)'}
              >
                {isRecording ? <Square className="h-4 w-4 fill-white" /> : <Mic className="h-4 w-4" />}
              </button>

              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={isRecording ? 'Escuchando tu pregunta...' : 'Pregunta o mantén presionado el micro...'}
                className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-24"
              />

              {/* Botón Enviar texto */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="mr-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shadow-xs"
                title="Enviar mensaje"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Voz Whisper & Datos oficiales de obra
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                {isSpeaking ? (
                  <button onClick={stopSpeaking} className="text-red-500 font-semibold underline">
                    Detener voz
                  </button>
                ) : (
                  <span>
                    Clic en 🎙️ para hablar o <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
