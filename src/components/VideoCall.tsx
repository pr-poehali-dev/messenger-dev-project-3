import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface VideoCallProps {
  isIncoming?: boolean;
  callerName?: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onEnd: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

const VideoCall = ({ 
  isIncoming = false, 
  callerName = 'Пользователь',
  callerAvatar,
  callType,
  onEnd,
  onAccept,
  onReject
}: VideoCallProps) => {
  const [isConnected, setIsConnected] = useState(!isIncoming);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [callDuration, setCallDuration] = useState(0);
  const [isLocalStreamReady, setIsLocalStreamReady] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initializeMedia = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      setIsLocalStreamReady(true);
      
      if (!isIncoming) {
        setupPeerConnection(stream);
        createOffer();
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Не удалось получить доступ к камере/микрофону');
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        startCallTimer();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('Offer created:', offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleAcceptCall = async () => {
    if (onAccept) {
      onAccept();
    }
    setIsConnected(true);
    await initializeMedia();
    startCallTimer();
  };

  const handleRejectCall = () => {
    if (onReject) {
      onReject();
    }
    cleanup();
  };

  const startCallTimer = () => {
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleEndCall = () => {
    cleanup();
    onEnd();
  };

  useEffect(() => {
    if (!isIncoming) {
      initializeMedia();
    }

    return () => {
      cleanup();
    };
  }, []);

  if (isIncoming && !isConnected) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-md p-8 text-center animate-scale-in">
          <div className="mb-6">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              {callerAvatar ? (
                <img 
                  src={callerAvatar} 
                  alt={callerName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="User" size={64} className="text-primary" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse"></div>
            </div>
            <h2 className="text-2xl font-bold mb-2">{callerName}</h2>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Icon name={callType === 'video' ? 'Video' : 'Phone'} size={20} />
              {callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="destructive"
              onClick={handleRejectCall}
              className="rounded-full w-16 h-16"
            >
              <Icon name="PhoneOff" size={24} />
            </Button>
            <Button
              size="lg"
              onClick={handleAcceptCall}
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            >
              <Icon name="Phone" size={24} />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        {callType === 'video' ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute top-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-lg object-cover ${
                isVideoOff ? 'hidden' : ''
              }`}
            />

            {isVideoOff && (
              <div className="absolute top-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-lg bg-gray-800 flex items-center justify-center">
                <Icon name="VideoOff" size={48} className="text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <div className="text-center">
              <div className="w-48 h-48 mx-auto mb-8 relative">
                {callerAvatar ? (
                  <img 
                    src={callerAvatar} 
                    alt={callerName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                    <Icon name="User" size={96} className="text-primary" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-pulse"></div>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">{callerName}</h2>
              <p className="text-muted-foreground text-lg">
                {isConnected ? formatTime(callDuration) : 'Соединение...'}
              </p>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full">
          <p className="font-semibold">{formatTime(callDuration)}</p>
        </div>

        {!isLocalStreamReady && isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <Icon name="Loader2" size={48} className="animate-spin mx-auto mb-4" />
              <p>Подключение...</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={isMuted ? 'destructive' : 'secondary'}
            onClick={toggleMute}
            className="rounded-full w-16 h-16"
          >
            <Icon name={isMuted ? 'MicOff' : 'Mic'} size={24} />
          </Button>

          {callType === 'video' && (
            <Button
              size="lg"
              variant={isVideoOff ? 'destructive' : 'secondary'}
              onClick={toggleVideo}
              className="rounded-full w-16 h-16"
            >
              <Icon name={isVideoOff ? 'VideoOff' : 'Video'} size={24} />
            </Button>
          )}

          <Button
            size="lg"
            variant="destructive"
            onClick={handleEndCall}
            className="rounded-full w-20 h-20"
          >
            <Icon name="PhoneOff" size={28} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
