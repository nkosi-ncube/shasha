"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import {
  Send,
  LoaderCircle,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRealTimeHelp } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type Message = {
  role: "user" | "ai";
  text: string;
  audioUrl?: string;
};

export default function ShashaApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const handleStartConversation = async () => {
    setIsStarting(true);
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(cameraStream);
      setHasCameraPermission(true);
      setConversationStarted(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access the camera. Please check permissions and try again.",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopConversation = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setConversationStarted(false);
    setHasCameraPermission(null);
    setMessages([]);
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const captureCurrentFrame = (): string | null => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        return canvas.toDataURL("image/jpeg");
      }
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = formData.get("question") as string;

    if (!question.trim()) return;

    const frameDataUri = captureCurrentFrame();
    if (!frameDataUri) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not capture frame. Please ensure camera is working.",
      });
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setIsProcessing(true);

    const response = await getRealTimeHelp({
      photoDataUri: frameDataUri,
      query: question,
    });
    
    if ("error" in response) {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: response.error,
      });
      setMessages((prev) => prev.slice(0, -1));
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: response.textExplanation,
          audioUrl: response.audioExplanation,
        },
      ]);
      const audio = new Audio(response.audioExplanation);
      audio.play().catch(e => {
        console.error("Error playing audio:", e)
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Could not play audio response. Your browser might be blocking it.",
        });
      });
    }

    setIsProcessing(false);
    (event.target as HTMLFormElement).reset();
  };
  
  const clearChat = () => {
    setMessages([]);
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl overflow-hidden h-[95vh] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <Sparkles className="text-primary w-8 h-8" />
          <div>
            <CardTitle className="font-headline text-2xl">Shasha</CardTitle>
            <CardDescription>Your AI Homework Helper</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversationStarted && (
            <Button variant="destructive" onClick={handleStopConversation} disabled={isProcessing}>
              <VideoOff className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
          <Button variant="outline" onClick={clearChat} disabled={isProcessing || messages.length === 0}>
            Clear Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col lg:flex-row p-0 overflow-hidden">
        {!conversationStarted ? (
          <div className="flex-grow flex items-center justify-center w-full">
            <Button onClick={handleStartConversation} size="lg" disabled={isStarting}>
              {isStarting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Video />
              )}
              Start Conversation
            </Button>
          </div>
        ) : (
          <>
            <div className="lg:w-1/2 lg:border-r bg-black relative flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {hasCameraPermission === false && (
                 <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
                  <Alert variant="destructive" className="max-w-sm">
                    <VideoOff className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please grant camera access in your browser settings to use Shasha. You may need to reload the page.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
               {hasCameraPermission === null && (
                 <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary-foreground" />
                 </div>
               )}
            </div>
            <div className="flex flex-col h-full lg:w-1/2">
                <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                  <div className="space-y-6">
                     {messages.length === 0 && (
                        <div className="flex items-center justify-center h-full text-center p-8">
                           <p className="text-muted-foreground">
                             Point your camera at a problem and ask a question below to get started.
                           </p>
                        </div>
                     )}
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 ${
                          message.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        {message.role === "ai" && (
                          <Avatar>
                            <AvatarFallback>
                              <Sparkles />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-md rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                        </div>
                         {message.role === "user" && (
                          <Avatar>
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isProcessing && messages.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            <Sparkles />
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-md rounded-lg p-3 bg-secondary">
                            <LoaderCircle className="animate-spin h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-card">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <Textarea
                      name="question"
                      placeholder="Ask a question..."
                      className="flex-grow resize-none"
                      rows={1}
                      disabled={isProcessing || !hasCameraPermission}
                    />
                    <Button type="submit" size="icon" disabled={isProcessing || !hasCameraPermission}>
                      {isProcessing ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Send />
                      )}
                      <span className="sr-only">Send</span>
                    </Button>
                  </form>
                </div>
              </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
