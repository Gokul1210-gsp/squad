import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ShieldQuestion, 
  Upload, 
  Zap, 
  Thermometer, 
  AlertTriangle, 
  Activity,
  Maximize2,
  ChevronRight,
  RefreshCw,
  FileText,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeSolarPanel, type AnalysisResult, type Defect } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleAnalyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeSolarPanel(image, 'image/jpeg');
      setResult(res);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-400';
      case 'needs_maintenance': return 'text-amber-400';
      case 'critical_action_required': return 'text-rose-400';
      default: return 'text-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critical': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <Zap className="w-5 h-5 text-black fill-current" />
          </div>
          <h1 className="text-lg font-bold tracking-tight uppercase">SolScan <span className="text-emerald-500">v2.4</span></h1>
        </div>
        <div className="flex items-center gap-6 text-xs font-mono text-white/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM READY
          </div>
          <div className="hidden md:block">DRONE_LINK: ACTIVE</div>
          <div className="hidden md:block">LAT: 34.0522° N | LON: 118.2437° W</div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image & Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-video rounded-2xl overflow-hidden glass group">
            {!image ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                  isDragActive ? "bg-emerald-500/10" : "hover:bg-white/5"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-medium">Drop drone imagery here</p>
                <p className="text-sm text-white/40 mt-1">Supports RGB and Thermal formats</p>
              </div>
            ) : (
              <div className="relative h-full">
                <img 
                  ref={imageRef}
                  src={image} 
                  alt="Solar Panel" 
                  className="w-full h-full object-contain"
                />
                {analyzing && <div className="scan-line" />}
                
                {/* Defect Overlays */}
                {result && result.defects.map((defect, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "absolute border-2 rounded-sm pointer-events-none",
                      defect.severity === 'critical' ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
                      defect.severity === 'high' ? "border-orange-500" :
                      defect.severity === 'medium' ? "border-amber-500" : "border-emerald-500"
                    )}
                    style={{
                      left: `${defect.location[0] / 10}%`,
                      top: `${defect.location[1] / 10}%`,
                      width: `${defect.location[2] / 10}%`,
                      height: `${defect.location[3] / 10}%`,
                    }}
                  >
                    <div className={cn(
                      "absolute -top-6 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded-t whitespace-nowrap uppercase",
                      defect.severity === 'critical' ? "bg-rose-500 text-white" :
                      defect.severity === 'high' ? "bg-orange-500 text-white" :
                      defect.severity === 'medium' ? "bg-amber-500 text-black" : "bg-emerald-500 text-black"
                    )}>
                      {defect.type} ({Math.round(defect.confidence * 100)}%)
                    </div>
                  </motion.div>
                ))}

                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-md hover:bg-rose-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              disabled={!image || analyzing}
              onClick={handleAnalyze}
              className={cn(
                "flex-1 h-14 rounded-xl font-bold flex items-center justify-center gap-3 transition-all",
                !image || analyzing 
                  ? "bg-white/5 text-white/20 cursor-not-allowed" 
                  : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-[0.98]"
              )}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  PROCESSING NEURAL ENGINE...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  START AI ANALYSIS
                </>
              )}
            </button>
            <button className="w-14 h-14 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
              <Camera className="w-6 h-6 text-white/60" />
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Results & Metrics */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 glass rounded-2xl border-dashed border-white/10"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <ShieldQuestion className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-xl font-bold mb-2">Awaiting Telemetry</h3>
                <p className="text-sm text-white/40 max-w-xs">
                  Upload drone imagery to begin defect detection and efficiency assessment.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Health Score Card */}
                <div className="glass rounded-2xl p-6 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">Overall Health Score</p>
                      <h2 className={cn("text-5xl font-black", getStatusColor(result.status))}>
                        {result.overall_health_score}%
                      </h2>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold border uppercase",
                      result.status === 'healthy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      result.status === 'needs_maintenance' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {result.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] text-white/40 uppercase mb-1">Efficiency Loss</p>
                      <p className="text-2xl font-bold text-rose-400">-{result.total_efficiency_loss}%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] text-white/40 uppercase mb-1">Defects Found</p>
                      <p className="text-2xl font-bold">{result.defects_found}</p>
                    </div>
                  </div>
                </div>

                {/* Defects List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Detection Log</h3>
                    <span className="text-[10px] font-mono text-white/30">CONFIDENCE THRESHOLD: 60%</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.defects.map((defect, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass rounded-xl p-4 border-l-4 border-l-emerald-500/50"
                        style={{ borderLeftColor: 
                          defect.severity === 'critical' ? '#f43f5e' : 
                          defect.severity === 'high' ? '#f97316' : 
                          defect.severity === 'medium' ? '#fbbf24' : '#10b981' 
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-sm uppercase">{defect.type}</h4>
                            <p className="text-[10px] text-white/40 font-mono">ID: FLT-{(i+100).toString(16).toUpperCase()}</p>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getSeverityColor(defect.severity))}>
                            {defect.severity}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 mb-3 leading-relaxed">
                          {defect.recommendation}
                        </p>
                        <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-rose-400" />
                            <span className="text-[10px] font-mono text-rose-400">-{defect.efficiency_loss}% LOSS</span>
                          </div>
                          {defect.metadata?.temperature && (
                            <div className="flex items-center gap-1.5">
                              <Thermometer className="w-3 h-3 text-orange-400" />
                              <span className="text-[10px] font-mono text-orange-400">{defect.metadata.temperature}°C</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[10px] font-mono text-white/30">{Math.round(defect.confidence * 100)}% CONF</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4">
                  <button className="w-full h-12 glass rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Generate Full Maintenance Report
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
