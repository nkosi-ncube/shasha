"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Image from "next/image";
import {
  Camera,
  Send,
  LoaderCircle,
  AlertTriangle,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getExplanation } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type Message = {
  role: "user" | "ai";
  text: string;
  audio?: string;
};

export default function ShashaApp() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    async function getCameraStream() {
      if (!capturedImage) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          setStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          toast({
            variant: "destructive",
            title: "Camera Error",
            description: "Could not access the camera. Please check permissions and try again.",
          });
        }
      }
    }
    getCameraStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [capturedImage, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUri);
        setMessages([
          { role: "ai", text: "Great! I've got the problem. What's your question?" },
        ]);
        stream?.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = formData.get("question") as string;

    if (!question.trim() || !capturedImage) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setIsProcessing(true);

    const response = await getExplanation({
      problemImage: capturedImage,
      studentQuestion: question,
    });
    
    if ("error" in response) {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: response.error,
      });
      setMessages((prev) => prev.slice(0, -1)); // Remove user message if AI fails
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: response.textExplanation,
          audio: response.audioExplanation,
        },
      ]);
    }

    setIsProcessing(false);
    (event.target as HTMLFormElement).reset();
  };

  const handlePlayAudio = (audioDataUri: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(audioDataUri);
    audioRef.current.play().catch(e => console.error("Error playing audio:", e));
  };
  
  const resetApp = () => {
    setCapturedImage(null);
    setMessages([]);
    setIsProcessing(false);
    if(stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl overflow-hidden h-[90vh] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="text-primary w-8 h-8" />
          <div>
            <CardTitle className="font-headline text-2xl">Shasha</CardTitle>
            <CardDescription>Your AI Homework Helper</CardDescription>
          </div>
        </div>
        {capturedImage && (
          <Button variant="outline" onClick={resetApp}>New Problem</Button>
        )}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
        {!capturedImage ? (
          <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-6">
              <Button
                size="lg"
                className="rounded-full h-20 w-20 bg-primary/80 hover:bg-primary border-4 border-primary-foreground/50 backdrop-blur-sm"
                onClick={handleCapture}
                aria-label="Capture problem"
              >
                <Camera className="h-10 w-10" />
              </Button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <Image
                src={capturedImage}
                alt="Captured homework problem"
                width={200}
                height={150}
                className="rounded-lg object-contain mx-auto max-h-[150px]"
              />
            </div>
            <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
              <div className="space-y-6">
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
                      {message.audio && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 -ml-2"
                          onClick={() => handlePlayAudio(message.audio!)}
                        >
                          <Volume2 className="h-4 w-4 mr-2" />
                          Play Explanation
                        </Button>
                      )}
                    </div>
                     {message.role === "user" && (
                      <Avatar>
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isProcessing && (
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
                  placeholder="Ask a question about the problem..."
                  className="flex-grow resize-none"
                  rows={1}
                  disabled={isProcessing}
                />
                <Button type="submit" size="icon" disabled={isProcessing}>
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
        )}
      </CardContent>
    </Card>
  );
}
