import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { MessageCircle, Send, Bot, User, Minimize2, Maximize2, Monitor, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, detectPromptInjection } from '@/lib/security';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'maturion';
  timestamp: Date;
  hasKnowledgeBase?: boolean;
  gapTicketId?: string;
  missingSpecifics?: string[];
  sources?: Array<{
    document_title: string;
    doc_type: string;
    score: number;
  }>;
}

interface MaturionChatProps {
  context?: string;
  currentDomain?: string;
  className?: string;
}

export const MaturionChat: React.FC<MaturionChatProps> = ({ 
  context, 
  currentDomain, 
  className 
}) => {
  // Debug log to ensure component is rendering
  // MaturionChat rendering with context and domain
  
  // Load messages from localStorage or use default
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem('maturion-chat-messages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        return parsed.length > 0 ? parsed : [
          {
            id: '1',
            content: "I'm Maturion, your diamond industry security specialist. I provide specific, actionable guidance for diamond operations, controls, and compliance. What diamond security topic can I help you with today?",
            sender: 'maturion',
            timestamp: new Date()
          }
        ];
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
    
    return [
      {
        id: '1',
        content: "Hello! I'm Maturion, your operational maturity specialist. I help organizations navigate their journey from reactive to resilient. How can I assist with your maturity assessment today?",
        sender: 'maturion',
        timestamp: new Date()
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(() => {
    // Load chat state from localStorage
    try {
      const savedState = localStorage.getItem('maturion-chat-open');
      return savedState ? JSON.parse(savedState) : false;
    } catch {
      return false;
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('maturion-chat-messages', JSON.stringify(messages));
  }, [messages]);

  // Save chat open state to localStorage
  useEffect(() => {
    localStorage.setItem('maturion-chat-open', JSON.stringify(isOpen));
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check for diagnostic commands
    if (inputValue.trim().startsWith('!')) {
      handleDiagnosticCommand(inputValue.trim());
      return;
    }

    // Security validation
    const sanitizedInput = sanitizeInput(inputValue);
    const wasSanitized = sanitizedInput !== inputValue;
    if (wasSanitized) {
      console.info('[Gate D] InputSanitization', { before: inputValue, after: sanitizedInput });
    }
    if (detectPromptInjection(sanitizedInput)) {
      console.warn('[Gate D] PromptInjectionDetected');
      toast({
        title: "Invalid Input",
        description: "Please rephrase your question.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: sanitizedInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const payload = {
        prompt: sanitizedInput,
        context: context || 'Diamond industry security and operational controls',
        currentDomain: currentDomain || 'General',
        organizationId: currentOrganization?.id,
        orgId: currentOrganization?.id,
        domainFilters: ["Organization Profile", "Diamond Knowledge Pack"]
      };
      console.info('[Gate D] maturion-ai-chat payload', payload);

      const { data, error } = await supabase.functions.invoke('maturion-ai-chat', {
        body: payload
      });

      if (error) throw error;

      // DIAMOND-FIRST: Clean response of meta-language about sources
      let responseContent = data.content || data.response || 'I apologize, but I encountered an issue processing your request. Please try again.';
      
      // Remove knowledge base indicators and meta-language
      responseContent = responseContent.replace(/📚.*$/gm, '');
      responseContent = responseContent.replace(/\*Response based on.*\*/gi, '');
      responseContent = responseContent.replace(/Based on your uploaded.*knowledge base/gi, '');
      responseContent = responseContent.trim();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: 'maturion',
        timestamp: new Date(),
        hasKnowledgeBase: data.hasDocumentContext || false,
        gapTicketId: data.gapTicketId,
        missingSpecifics: data.missingSpecifics || [],
        sources: data.sources || []
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Log diamond-specific confidence data
      if (currentOrganization?.id) {
        try {
          const hasKnowledgeBase = data.hasDocumentContext || false;
          const isDiamondSpecific = responseContent.toLowerCase().includes('diamond') || 
                                   responseContent.toLowerCase().includes('kpc') ||
                                   responseContent.toLowerCase().includes('dual custody');
                                   
          await supabase.from('ai_confidence_scoring').insert({
            organization_id: currentOrganization.id,
            confidence_category: isDiamondSpecific ? 'diamond_specific_response' : 'general_response',
            base_confidence: hasKnowledgeBase ? 0.95 : 0.7, // Higher confidence for diamond-specific with knowledge base
            adjusted_confidence: hasKnowledgeBase ? 0.95 : 0.7,
            confidence_factors: {
              source_type: data.sourceType || 'general',
              has_knowledge_base: hasKnowledgeBase,
              is_diamond_specific: isDiamondSpecific,
              gap_ticket_created: !!data.gapTicketId,
              missing_specifics_count: data.missingSpecifics?.length || 0,
              query_length: sanitizedInput.length,
              response_timestamp: new Date().toISOString()
            }
          });
        } catch (confidenceError) {
          console.log('Note: Could not log confidence data:', confidenceError);
        }
      }
    } catch (error) {
      console.error('[Gate D] maturion-ai-chat error:', error);
      
      // Check if this might be an ingestion-in-progress issue
      const errorMessage = error?.message || String(error);
      const isIngestionError = errorMessage.includes('ingestion') || 
                               errorMessage.includes('processing') ||
                               errorMessage.includes('embedding') ||
                               errorMessage.includes('chunks');
      
      if (isIngestionError) {
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "🔄 I'm currently processing your uploaded documents to provide the most accurate, diamond-specific guidance. While this completes, I can still help with general diamond industry questions about security controls, operational procedures, and compliance frameworks. What would you like to discuss?",
          sender: 'maturion',
          timestamp: new Date(),
          hasKnowledgeBase: false
        };
        setMessages(prev => [...prev, fallbackMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "I apologize, but I'm experiencing temporary difficulties. Please try rephrasing your question or contact support if the issue persists.",
          sender: 'maturion',
          timestamp: new Date(),
          hasKnowledgeBase: false
        };
        setMessages(prev => [...prev, errorMessage]);
        
        toast({
          title: "Connection Error",
          description: "Unable to reach Maturion. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnosticCommand = async (command: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: command,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    let response = '';
    if (command === '!status' || command === '!memory') {
      try {
        // Get document count for the organization
        const { data: docData } = await supabase
          .from('ai_documents')
          .select('id')
          .eq('organization_id', currentOrganization?.id)
          .eq('processing_status', 'completed');

        const { data: chunkData } = await supabase
          .from('ai_document_chunks')
          .select('id, embedding')
          .eq('organization_id', currentOrganization?.id);

        const docCount = docData?.length || 0;
        const chunkCount = chunkData?.length || 0;
        const chunksWithEmbeddings = chunkData?.filter(chunk => chunk.embedding !== null).length || 0;
        const embeddingPercentage = chunkCount > 0 ? Math.round((chunksWithEmbeddings / chunkCount) * 100) : 0;

        if (command === '!status') {
          response = `📊 **Maturion Status Report**\n\n✅ System: Online\n📄 Documents: ${docCount} processed\n🧩 Knowledge Chunks: ${chunkCount.toLocaleString()}\n🎯 Vector Search Ready: ${chunksWithEmbeddings.toLocaleString()} chunks (${embeddingPercentage}%)\n🏢 Organization: ${currentOrganization?.name || 'Unknown'}\n\n${chunksWithEmbeddings > 0 ? '✅ I have access to your uploaded documents and can provide context-aware guidance based on your specific organizational content.' : '⚠️ Embeddings need regeneration - click "Fix Embeddings" in Document Management.'}`;
        } else {
          response = `🧠 **Maturion Memory Analysis**\n\n📚 Available Knowledge Base: ${docCount} documents across ${chunkCount.toLocaleString()} knowledge chunks\n🎯 Vector Search Ready: ${chunksWithEmbeddings.toLocaleString()} chunks (${embeddingPercentage}%)\n📊 Content Types: MPS Documents, Standards, Audit Criteria, Governance Frameworks\n🏢 Organization Context: ${currentOrganization?.name || 'Unknown'}\n🎯 Domain Coverage: Leadership, Process Integrity, People & Culture, Protection, Proof it Works\n🔄 Processing Status: ${chunksWithEmbeddings === chunkCount ? 'All completed documents fully indexed and searchable' : 'Embeddings need regeneration for full search capability'}\n\n💡 ${chunksWithEmbeddings > 0 ? 'I can reference this knowledge base to provide specific, context-aware guidance tailored to your organization\'s uploaded content.' : 'Click "Fix Embeddings" to enable document-based responses.'}`;
        }
      } catch (error) {
        response = `⚠️ **Diagnostic Error**\n\nUnable to retrieve status information. Please check your connection and permissions.`;
      }
    } else if (command.startsWith('!doc ')) {
      const filename = command.replace('!doc ', '').trim();
      try {
        const { data: searchResult } = await supabase.functions.invoke('search-ai-context', {
          body: {
            query: filename,
            organizationId: currentOrganization?.id,
            limit: 5,
            threshold: 0.3
          }
        });
        
        const matchingChunks = searchResult?.results?.filter((r: any) => 
          r.document_name.toLowerCase().includes(filename.toLowerCase())
        ) || [];
        
        response = `📋 **Document Chunk Analysis: "${filename}"**\n\n🔍 Document: ${filename}\n📊 Matching chunks found: ${matchingChunks.length}\n🔗 Document types: ${[...new Set(matchingChunks.map((r: any) => r.document_type))].join(', ')}\n💾 Total content size: ~${Math.round(matchingChunks.reduce((acc: number, r: any) => acc + r.content.length, 0) / 1000)}k characters\n\n${matchingChunks.length > 0 ? '✅ Document is accessible to Maturion' : '⚠️ No chunks found for this document name'}`;
      } catch (error) {
        response = `❌ Error searching for document: ${error}`;
      }
    } else if (command.startsWith('!retrieval ')) {
      const query = command.replace('!retrieval ', '').trim();
      try {
        const { data: searchResult } = await supabase.functions.invoke('search-ai-context', {
          body: {
            query: query,
            organizationId: currentOrganization?.id,
            limit: 10,
            threshold: 0.5
          }
        });
        
        const results = searchResult?.results || [];
        const docs = [...new Set(results.map((r: any) => r.document_name))];
        const avgConfidence = results.length > 0 ? 
          (results.reduce((acc: number, r: any) => acc + r.similarity, 0) / results.length).toFixed(3) : '0';
        
        response = `🔍 **Retrieval Test: "${query}"**\n\n🎯 Query: ${query}\n📚 Documents matched: ${docs.length} (${docs.slice(0, 3).join(', ')}${docs.length > 3 ? '...' : ''})\n⚡ Average confidence: ${avgConfidence}\n📊 Total chunks: ${results.length}\n${results.length > 0 ? '✅ Content found - Maturion can access this information' : '⚠️ No matches found - may need to rephrase query'}\n\nTop matches: ${results.slice(0, 2).map((r: any) => `\n• ${r.document_name} (${r.similarity.toFixed(2)})`).join('')}`;
      } catch (error) {
        response = `❌ Error testing retrieval: ${error}`;
      }
    } else {
      response = `🤖 **Available Commands:**\n\n• \`!status\` - Show system status and available knowledge\n• \`!memory\` - Display memory and document access info\n• \`!doc <filename>\` - Check chunks for specific document\n• \`!retrieval <query>\` - Test document retrieval for query\n\nTry asking: "Can you summarize our Diamond Security and Control Principles?" or "Are you able to read the uploaded documents?"`;
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: response,
      sender: 'maturion',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setIsMinimized(false);
  };

  if (!isOpen) {
    // MaturionChat: Rendering closed state
    return (
      <div className={`fixed bottom-6 right-6 z-[100] ${className}`} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
        <Button
          onClick={toggleChat}
          className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
        >
          <div className="flex flex-col items-center">
            <Bot className="h-6 w-6 text-primary-foreground" />
            <span className="text-xs text-primary-foreground mt-1">Maturion</span>
          </div>
        </Button>
      </div>
    );
  }

  // MaturionChat: Rendering open state
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-[200]' : 'fixed bottom-6 right-6 z-[100]'} ${className}`} 
         style={isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 } 
                            : { position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
      <Card className={`shadow-2xl border-0 bg-white/95 backdrop-blur transition-all duration-300 ${
        isFullscreen ? 'w-full h-full rounded-none' : 
        isMinimized ? 'w-96 h-16' : 'w-96 h-96'
      }`}>
        <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Maturion</CardTitle>
                <p className="text-sm text-blue-100">Powering Assurance. Elevating Performance.</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {!isFullscreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMinimize}
                  className="text-white hover:bg-white/20 p-1"
                  title="Minimize"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 p-1"
                title="Fullscreen"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className="text-white hover:bg-white/20 p-1"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className={`p-0 flex flex-col ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-80'}`}>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.sender === 'maturion' && (
                          <Bot className="h-4 w-4 mt-0.5 text-blue-600" />
                        )}
                        {message.sender === 'user' && (
                          <User className="h-4 w-4 mt-0.5 text-white" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {(message.timestamp instanceof Date 
                              ? message.timestamp 
                              : new Date(message.timestamp)
                            ).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {message.sender === 'maturion' && message.sources && message.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Sources:</p>
                              <div className="space-y-1">
                                {message.sources.slice(0, 3).map((source, index) => (
                                  <div key={index} className="text-xs text-gray-500 flex items-center justify-between">
                                    <span className="truncate">
                                      {source.document_title} ({source.doc_type})
                                    </span>
                                    <span className="ml-2 text-blue-600 font-mono">
                                      {(source.score * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                ))}
                                {message.sources.length > 3 && (
                                  <p className="text-xs text-gray-400">
                                    +{message.sources.length - 3} more sources
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-lg max-w-[85%]">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Maturion about your maturity journey..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};