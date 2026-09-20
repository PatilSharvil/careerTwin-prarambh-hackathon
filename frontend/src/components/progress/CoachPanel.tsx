import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { sendCoachMessage } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useToast } from '../ui/Toast';
import type { AnalyzeResponse, Diff } from '../../types/api';
import {
  X,
  Send,
  Wrench,
  Sparkles,
  Bot,
  Minimize2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

export interface CoachPanelProps {
  onPlanUpdated?: (state: AnalyzeResponse, diff: Diff | null, narrative: string) => void;
}

const SUGGESTED_CHIPS = [
  'What should I do today?',
  'Why Docker?',
  'I completed RAG',
];

export const CoachPanel: React.FC<CoachPanelProps> = ({ onPlanUpdated }) => {
  const { showToast } = useToast();

  const coachMessages = useStore((s) => s.coachMessages);
  const addCoachMessage = useStore((s) => s.addCoachMessage);
  const sessionId = useStore((s) => s.sessionId);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [coachMessages, isOpen, isMinimized]);

  // If coach endpoint returned NOT_IMPLEMENTED, hide the panel completely as per SPEC
  if (!isAvailable) {
    return null;
  }

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend ?? inputText).trim();
    if (!message || isLoading) return;

    // Append user message to store
    addCoachMessage({
      sender: 'user',
      text: message,
    });
    setInputText('');
    setIsLoading(true);

    try {
      const res = await sendCoachMessage({
        message,
        session_id: sessionId,
      });

      // Append coach message to store
      addCoachMessage({
        sender: 'coach',
        text: res.reply,
        tool_calls: res.tool_calls,
      });

      // If state changed, update store and diff banner
      if (res.state_changed && res.state) {
        onPlanUpdated?.(res.state, res.diff, res.reply);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'NOT_IMPLEMENTED') {
        // Spec rule: If /coach returns NOT_IMPLEMENTED, hide the panel
        setIsAvailable(false);
        showToast({
          type: 'info',
          message: 'Coach feature is currently not implemented on the server.',
        });
        return;
      }

      const errorMessage =
        err instanceof ApiError
          ? err.message
          : 'Coach service currently unavailable.';
      showToast({
        type: 'error',
        title: 'Coach Error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderFormattedMessage = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 break-words [overflow-wrap:anywhere]">
        {lines.map((line, lineIdx) => {
          if (!line.trim()) {
            return <div key={lineIdx} className="h-1" />;
          }

          const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
          const cleanLine = isBullet ? line.trim().substring(2) : line;

          const parts = cleanLine.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);

          const renderedLine = parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-black text-black">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('http://') || part.startsWith('https://')) {
              return (
                <a
                  key={partIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-700 hover:text-blue-900 font-bold break-all inline-flex items-center gap-0.5 mx-0.5"
                >
                  <span>{part.length > 35 ? `${part.slice(0, 32)}...` : part}</span>
                  <ExternalLink className="w-3 h-3 inline flex-shrink-0" />
                </a>
              );
            }
            return <span key={partIdx}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={lineIdx} className="flex items-start gap-1.5 pl-1">
                <span className="text-black font-black leading-none mt-1.5">•</span>
                <div className="flex-1 min-w-0">{renderedLine}</div>
              </div>
            );
          }

          return <p key={lineIdx} className="leading-relaxed">{renderedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Floating Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 bg-[#ffe566] hover:bg-[#ffd633] text-black border-2 border-black rounded-2xl shadow-neo hover:shadow-neo-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all group font-black"
          aria-label="Open Career Coach"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#79e7a8] rounded-full border border-black" />
          </div>
          <span className="text-sm font-black tracking-wide">Coach AI</span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div
          className={`w-96 max-w-[calc(100vw-2rem)] bg-[#fdfbf7] rounded-3xl border-3 border-black shadow-[6px_6px_0px_0px_#000] flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-16' : 'h-[550px]'
          }`}
        >
          {/* Panel Header */}
          <div className="px-4 py-3.5 bg-[#ffe566] text-black border-b-2 border-black flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border-2 border-black shadow-neo-xs">
                <Bot className="w-4 h-4 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black leading-tight text-black">Career Coach</h3>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#79e7a8] border border-black inline-block" />
                </div>
                <p className="text-[10px] text-neutral-800 font-bold leading-none mt-0.5">
                  Grounded in your active roadmap
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1 rounded-lg text-black hover:bg-white border border-transparent hover:border-black transition-all"
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-black hover:bg-white border border-transparent hover:border-black transition-all"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body (hidden if minimized) */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#faf6ee] min-h-0">
                {coachMessages.length === 0 ? (
                  <div className="text-center py-8 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#ffe566] text-black flex items-center justify-center mx-auto mb-3 border-2 border-black shadow-neo-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-black mb-1">
                      Hi! I'm your Career Coach.
                    </h4>
                    <p className="text-xs text-neutral-600 font-bold leading-relaxed max-w-xs mx-auto mb-4">
                      Ask me what to focus on next, why a skill was prioritized, or tell me when you've completed a milestone.
                    </p>
                  </div>
                ) : (
                  coachMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl p-3.5 text-xs font-bold leading-relaxed border-2 border-black break-words [overflow-wrap:anywhere] ${
                          msg.sender === 'user'
                            ? 'bg-[#ffe566] text-black shadow-neo-xs rounded-br-none'
                            : 'bg-white text-black shadow-neo-xs rounded-bl-none'
                        }`}
                      >
                        {renderFormattedMessage(msg.text)}
                      </div>

                      {/* Tool Calls Chips for Coach messages */}
                      {msg.tool_calls && msg.tool_calls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[90%] break-all">
                          {msg.tool_calls.map((tool, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-[#b892ff]/30 text-black border border-black shadow-neo-xs break-all"
                            >
                              <Wrench className="w-2.5 h-2.5 text-black flex-shrink-0" />
                              <span className="break-all">
                                {tool.name}({Object.entries(tool.args || {})
                                  .map(([k, v]) => `${k}="${v}"`)
                                  .join(', ')})
                              </span>
                              {tool.ok && (
                                <span className="text-black font-black flex-shrink-0">✓</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Loading typing indicator */}
                {isLoading && (
                  <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white border-2 border-black max-w-[120px] shadow-neo-xs">
                    <span className="w-2 h-2 bg-black rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] text-black font-black ml-1">
                      Thinking...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Query Chips */}
              <div className="p-2 border-t-2 border-black bg-white overflow-x-auto flex items-center gap-2 no-scrollbar">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSendMessage(chip)}
                    className="flex-shrink-0 text-xs font-black text-black bg-[#faf6ee] hover:bg-[#ffe566] border-2 border-black px-3 py-1 rounded-xl shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t-2 border-black flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Coach or report progress..."
                  disabled={isLoading}
                  className="flex-1 text-xs font-bold px-3 py-2.5 bg-[#faf6ee] border-2 border-black rounded-xl text-black placeholder:text-neutral-500 shadow-neo-xs focus:bg-white focus:outline-none transition-colors"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputText.trim()}
                  className="p-2.5 bg-[#ffe566] hover:bg-[#ffd633] disabled:opacity-40 text-black border-2 border-black rounded-xl shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all font-black"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 text-black" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
