
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Info, Wind, Award, RefreshCw, Target, ChevronLeft, BookOpen, Sun, ShieldAlert, Heart, Camera as CameraIcon } from 'lucide-react';
import { GameState, HandData, GameMode } from './types';
import SkyCanvas from './components/SkyCanvas';
import { getHealingMessage } from './services/geminiService';

declare const Hands: any;
declare const Camera: any;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [gameMode, setGameMode] = useState<GameMode>('ADVENTURE');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [healingMessage, setHealingMessage] = useState<string>('');
  const [handData, setHandData] = useState<HandData>({ landmarks: [], isVisible: false, velocity: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<{text: string, x: number, y: number} | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const initHands = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    try {
      if (!handsRef.current) {
        handsRef.current = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        handsRef.current.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        handsRef.current.onResults((results: any) => {
          if (results.multiHandLandmarks?.length > 0) {
            setHandData({ landmarks: results.multiHandLandmarks[0], isVisible: true, velocity: 0 });
          } else {
            setHandData(prev => ({ ...prev, isVisible: false }));
          }
        });
      }

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        await camera.start();
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("Camera Init Error:", err);
      setCameraError("摄像头访问受阻，请确保已授权并关闭其他占用摄像头的应用。");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initHands();
  }, [initHands]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === GameState.PLAYING) {
      handleFinish();
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [gameState, timeLeft]);

  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setScore(0);
    setHealth(100);
    setTimeLeft(60);
    setGameState(GameState.PLAYING);
    setHealingMessage('');
  };

  const handleFinish = async () => {
    setGameState(GameState.FINISHED);
    const msg = await getHealingMessage(score, gameMode);
    setHealingMessage(msg);
  };

  const onStarCollected = useCallback((points: number, type?: string) => {
    setScore(prev => prev + points);
    if (type) {
      setFeedback({ text: type, x: 50, y: 50 });
      setTimeout(() => setFeedback(null), 800);
    }
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-hidden flex flex-col font-sans">
      <SkyCanvas 
        handData={handData} 
        onStarCollected={onStarCollected} 
        isPlaying={gameState === GameState.PLAYING} 
        mode={gameMode}
        onHealthChange={(h) => setHealth(h)}
      />

      <video ref={videoRef} className="hidden" playsInline webkit-playsinline="true" muted autoPlay />

      <header className="relative z-10 p-8 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center space-x-4">
          {gameState === GameState.PLAYING && (
            <button onClick={() => setGameState(GameState.LOBBY)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-serif tracking-widest text-blue-50">逐光之境</h1>
            <p className="text-[10px] text-blue-300/60 uppercase tracking-tighter">光影随行 &bull; 跨屏交互</p>
          </div>
        </div>

        {gameState === GameState.PLAYING && (
          <div className="flex space-x-12">
            {gameMode === 'MIST_CLEAR' && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-amber-400 opacity-70">火种纯净度</p>
                <div className="flex items-center justify-center space-x-2">
                  <Heart className={`w-5 h-5 ${health < 30 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} fill="currentColor" />
                  <p className={`text-3xl font-serif ${health < 30 ? 'text-red-400' : 'text-amber-100'}`}>{health}%</p>
                </div>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-blue-300">能量</p>
              <p className="text-3xl font-serif text-white">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-blue-300">倒计时</p>
              <p className="text-3xl font-serif text-blue-100">{timeLeft}s</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow flex items-center justify-center relative z-20 px-6">
        {isLoading && (
          <div className="text-center space-y-4">
             <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-400 opacity-50" />
             <p className="text-lg tracking-widest font-light animate-pulse">正在唤醒星空...</p>
          </div>
        )}

        {cameraError && !isLoading && (
          <div className="bg-red-500/20 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-red-500/30 text-center max-w-md space-y-6">
            <CameraIcon className="w-12 h-12 mx-auto text-red-400" />
            <p className="text-sm text-red-100/60 leading-relaxed">{cameraError}</p>
            <button onClick={initHands} className="px-8 py-3 bg-red-500/40 hover:bg-red-500/60 rounded-2xl transition-all font-bold">重新连接</button>
          </div>
        )}

        {!isLoading && !cameraError && gameState === GameState.LOBBY && (
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 animate-in zoom-in duration-500">
            <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 flex flex-col justify-center space-y-8 shadow-2xl">
              <h2 className="text-5xl font-serif leading-tight">光之守护者，<br/>欢迎回到这片星域</h2>
              <p className="text-lg text-blue-100/60 font-light leading-relaxed">每一个挥动的手势都是一次灵魂的深呼吸。驱散暗影、守护火种，在光影中寻找平衡。</p>
              <button onClick={() => setGameState(GameState.INSTRUCTIONS)} className="w-fit px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center space-x-3 border border-white/10"><BookOpen className="w-5 h-5" /><span>查看操作指引</span></button>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'MIST_CLEAR', title: '明灯守护', desc: '快速挥动手势击碎暗影，保护中心火种', icon: Sun, color: 'from-amber-500/40' },
                { id: 'SEQUENCE', title: '星序律动', desc: '按逻辑顺序连接星辰，训练专注与精准', icon: Target, color: 'from-emerald-500/40' },
                { id: 'ADVENTURE', title: '星空漫步', desc: '自由自在捕获星光，创造流光音阶', icon: Sparkles, color: 'from-blue-500/40' }
              ].map((m) => (
                <button key={m.id} onClick={() => startGame(m.id as GameMode)} className="w-full group bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] transition-all flex items-center space-x-6 text-left">
                  <div className={`p-5 rounded-3xl bg-gradient-to-br ${m.color} to-transparent border border-white/10 group-hover:scale-110 transition-transform`}><m.icon className="w-8 h-8" /></div>
                  <div><h3 className="text-xl font-bold tracking-widest">{m.title}</h3><p className="text-xs text-white/40 mt-1">{m.desc}</p></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === GameState.INSTRUCTIONS && (
          <div className="max-w-2xl w-full bg-black/60 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 space-y-10 animate-in fade-in zoom-in duration-300">
             <h2 className="text-3xl font-serif text-center tracking-widest text-amber-200">指引之书</h2>
             <div className="space-y-6">
                <div className="flex items-start space-x-6 p-6 bg-white/5 rounded-3xl">
                  <Wind className="w-10 h-10 text-blue-400 shrink-0" />
                  <p className="text-blue-100/60 text-sm leading-relaxed">“明灯守护”模式下，当暗影靠近中心时，必须【快速且大范围】地挥动手部，以“风”之名净化黑暗。</p>
                </div>
                <div className="flex items-start space-x-6 p-6 bg-white/5 rounded-3xl">
                  <Target className="w-10 h-10 text-emerald-400 shrink-0" />
                  <p className="text-blue-100/60 text-sm leading-relaxed">“星序律动”模式下，按照数字 1 到 6 的顺序依次触碰星环，错误的顺序将无法点亮星空。</p>
                </div>
             </div>
             <button onClick={() => setGameState(GameState.LOBBY)} className="w-full py-5 bg-white text-indigo-950 font-bold rounded-2xl hover:bg-blue-50 transition-all text-lg uppercase tracking-widest">开始试炼</button>
          </div>
        )}

        {gameState === GameState.FINISHED && (
          <div className="max-w-2xl w-full p-16 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[4rem] text-center space-y-12 animate-in slide-in-from-bottom duration-700">
            <Award className="w-24 h-24 mx-auto text-amber-200 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
            <div className="space-y-4">
              <h2 className="text-3xl font-serif text-blue-300 uppercase tracking-[0.3em]">试炼完成</h2>
              <p className="text-8xl font-serif text-white">{score}</p>
            </div>
            <div className="relative p-10 bg-white/5 rounded-[3rem] border border-white/10">
              <p className="text-2xl font-light italic text-blue-50 leading-relaxed">{healingMessage || "正在倾听星空的回响..."}</p>
            </div>
            <button onClick={() => setGameState(GameState.LOBBY)} className="px-16 py-5 bg-white text-indigo-950 rounded-full font-bold transition-all hover:scale-105 text-xl">返回大殿</button>
          </div>
        )}

        {feedback && (
          <div className="fixed pointer-events-none text-amber-200 font-serif text-5xl animate-out fade-out slide-out-to-top-32 duration-1000">
            {feedback.text}
          </div>
        )}
      </main>

      {!cameraError && gameState === GameState.PLAYING && !handData.isVisible && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-500/20 backdrop-blur-2xl border border-red-500/30 px-10 py-4 rounded-full text-red-100 animate-bounce">
          <Info className="inline w-5 h-5 mr-2" />
          <span className="text-sm tracking-widest">请挥动手部，唤醒星灵</span>
        </div>
      )}
    </div>
  );
};

export default App;
