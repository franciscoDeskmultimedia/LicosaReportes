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
  ChevronDown,
  Building2,
  Database,
  ArrowRight,
  Loader2,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
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
    // Reemplaza **negrita**
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

    // Detección de tablas markdown
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      // Si es separador (|---|---|), omitir de filas de datos
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

    // Títulos
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

    // Listas con viñetas
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(trimmed.replace(/^[-*]\s+/, ''))}
        </li>
      );
      return;
    }

    // Listas numeradas
    if (/^\d+\.\s+/.test(trimmed)) {
      elements.push(
        <div key={index} className="ml-4 text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(trimmed)}
        </div>
      );
      return;
    }

    // Párrafo normal
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

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
    setMessages([]);
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
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase">
            IA Obra
          </span>
        </button>
      )}

      {/* Ventana de Chat Flotante / Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'w-[95vw] md:w-[700px] h-[85vh]'
              : 'w-[92vw] sm:w-[460px] h-[600px] max-h-[85vh]'
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
                </div>
                <p className="text-[11px] text-slate-300">Asistente técnico & financiero de obra</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
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

          {/* Selector de Proyecto Activo */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-xs">
            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-medium shrink-0">Obra:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-white text-slate-800 text-xs rounded-md border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">🌐 Todas las obras (búsqueda global)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">
                  ¿En qué puedo ayudarte hoy?
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1 mb-5">
                  Consulta datos en tiempo real de avance contractual, planillaje de rubros, kardex de bodega y reportes diarios.
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
                    {message.role === 'assistant' && message.toolsExecuted && message.toolsExecuted.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1 items-center pb-1.5 border-b border-slate-100">
                        <Database className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] text-slate-400 font-medium">Fuentes consultadas:</span>
                        {message.toolsExecuted.map((tName, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] text-slate-600 font-mono"
                          >
                            {TOOL_FRIENDLY_NAMES[tName] || tName}
                          </span>
                        ))}
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

            {/* Indicador de cargando */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="rounded-2xl rounded-bl-xs bg-white border border-slate-200 px-4 py-3 shadow-xs flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-600 font-medium animate-pulse">
                    Consultando datos y generando análisis...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Pregunta sobre avance, rubros, bodega o reportes..."
                className="w-full bg-transparent px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-24"
              />
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
                Datos verificados de obra
              </span>
              <span className="text-[10px] text-slate-400">
                Presiona <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> para enviar
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
