import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FileUpload } from './FileUpload';

interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  created_at: string;
  sender?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email?: string;
  };
}

interface RealTimeChatProps {
  sessionId: string;
  participantIds: string[];
}

export const RealTimeChat = ({ sessionId, participantIds }: RealTimeChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              first_name,
              last_name,
              avatar_url,
              email
            )
          `)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages((data as any[])?.map(item => ({
          ...item,
          message_type: item.message_type as 'text' | 'file' | 'image'
        })) || []);
      } catch (error: any) {
        toast({
          title: "Error loading messages",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [sessionId]);

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey (
                first_name,
                last_name,
                avatar_url,
                email
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, {
              ...data,
              message_type: data.message_type as 'text' | 'file' | 'image'
            } as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (url: string, filePath: string) => {
    if (!user) return;

    try {
      const messageType = filePath.includes('image') || filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i) 
        ? 'image' 
        : 'file';

      const { error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender_id: user.id,
          content: `Shared a ${messageType}`,
          message_type: messageType,
          file_url: url
        });

      if (error) throw error;

      setShowFileUpload(false);
    } catch (error: any) {
      toast({
        title: "Error sharing file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getUserInitials = (message: Message) => {
    if (message.sender?.first_name && message.sender?.last_name) {
      return `${message.sender.first_name[0]}${message.sender.last_name[0]}`;
    }
    return message.sender?.email?.[0]?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Session Chat</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[70%] ${
                    message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="h-8 w-8 mx-2">
                    <AvatarImage src={message.sender?.avatar_url} />
                    <AvatarFallback>{getUserInitials(message)}</AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={`rounded-lg p-3 ${
                      message.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="space-y-2">
                      {message.message_type === 'text' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      {message.message_type === 'image' && message.file_url && (
                        <div className="space-y-2">
                          <img 
                            src={message.file_url} 
                            alt="Shared image"
                            className="max-w-full h-auto rounded cursor-pointer"
                            onClick={() => window.open(message.file_url, '_blank')}
                          />
                          <p className="text-xs opacity-75">{message.content}</p>
                        </div>
                      )}
                      
                      {message.message_type === 'file' && message.file_url && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Paperclip className="h-4 w-4" />
                            <a 
                              href={message.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm underline hover:no-underline"
                            >
                              {message.content}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs opacity-75">
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* File Upload Area */}
        {showFileUpload && (
          <div className="border-t p-4">
            <FileUpload
              bucket="session-materials"
              purpose="session_material"
              sessionId={sessionId}
              onUploadComplete={handleFileUpload}
              multiple={true}
              acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.txt']}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowFileUpload(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
            />
            
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};