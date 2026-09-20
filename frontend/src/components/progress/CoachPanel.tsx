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

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Floating Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group ring-4 ring-primary-500/20"
          aria-label="Open Career Coach"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-primary-600" />
          </div>
          <span className="text-sm font-semibold tracking-wide">Coach AI</span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div
          className={`w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[540px]'
          }`}
        >
          {/* Panel Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold leading-tight">Career Coach</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </div>
                <p className="text-[10px] text-primary-100 font-medium leading-none mt-0.5">
                  Grounded in your active roadmap
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                {coachMessages.length === 0 ? (
                  <div className="text-center py-8 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3 border border-primary-100">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 mb-1">
                      Hi! I'm your Career Coach.
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto mb-4">
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
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                          msg.sender === 'user'
                            ? 'bg-primary-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Tool Calls Chips for Coach messages */}
                      {msg.tool_calls && msg.tool_calls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[85%]">
                          {msg.tool_calls.map((tool, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              <Wrench className="w-2.5 h-2.5 text-primary-600" />
                              <span>
                                {tool.name}({Object.entries(tool.args || {})
                                  .map(([k, v]) => `${k}="${v}"`)
                                  .join(', ')})
                              </span>
                              {tool.ok && (
                                <span className="text-emerald-600 font-bold">✓</span>
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
                  <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white border border-slate-200 max-w-[120px] shadow-2xs">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                      Thinking...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Query Chips */}
              <div className="p-2 border-t border-slate-100 bg-white overflow-x-auto flex items-center gap-1.5 no-scrollbar">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSendMessage(chip)}
                    className="flex-shrink-0 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-primary-50 hover:text-primary-700 border border-slate-200 hover:border-primary-200 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Coach or report progress..."
                  disabled={isLoading}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputText.trim()}
                  className="p-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
