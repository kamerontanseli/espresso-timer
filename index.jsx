import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { 
  Coffee, 
  Timer, 
  Settings2, 
  History, 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  TrendingUp,
  Scale,
  Calculator,
  ArrowLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Utility for merging tailwind classes
 */
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

// --- Constants ---
const TARGET_RATIO = 2;
const MIN_GOOD_TIME = 25;
const MAX_GOOD_TIME = 30;
const DEFAULT_PRE_INFUSION_SECONDS = 10;

// --- Grunge Components ---

const NoiseOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.15] mix-blend-overlay"
       style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
  />
);

const GrungeButton = ({ children, onClick, className, variant = 'primary', disabled }) => {
  const baseStyles = "relative font-['Oswald'] uppercase tracking-widest font-bold border-2 border-[#1A1A1A] px-6 py-4 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation";
  const pointerHandledRef = useRef(false);
  
  const variants = {
    primary: "bg-[#DC143C] text-white shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A]",
    secondary: "bg-[#F0EAD6] text-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] hover:bg-white",
    black: "bg-[#1A1A1A] text-white shadow-[4px_4px_0px_0px_#888]"
  };

  const handlePointerUp = (event) => {
    if (disabled) return;
    pointerHandledRef.current = true;
    onClick?.(event);
  };

  const handleClick = (event) => {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    onClick?.(event);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, rotate: Math.random() * 2 - 1 }}
      whileTap={{ scale: 0.95 }}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], className)}
    >
      {children}
    </motion.button>
  );
};

const TapeLabel = ({ text, className }) => (
  <div className={cn("bg-[#C5A945]/80 inline-block px-2 py-1 transform -rotate-1 shadow-sm border border-[#1A1A1A]/20", className)}>
    <span className="font-['Courier_New'] font-bold text-xs text-[#1A1A1A] uppercase tracking-tighter">
      {text}
    </span>
  </div>
);

const SectionHeading = ({ children }) => (
  <h2 className="text-4xl font-['Oswald'] font-black uppercase tracking-tighter text-[#1A1A1A] mb-6 flex items-center gap-3 transform -rotate-1">
    {children}
  </h2>
);

// --- Main App Component ---

const App = () => {
  // --- State ---
  const [step, setStep] = useState('setup'); 
  const [shotType, setShotType] = useState('double'); 
  const [grindSize, setGrindSize] = useState(5);
  const [grindTime, setGrindTime] = useState(8.0); 
  const [grindYield, setGrindYield] = useState(''); 
  
  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [preInfusionSeconds, setPreInfusionSeconds] = useState(DEFAULT_PRE_INFUSION_SECONDS);
  const [preInfusionRemaining, setPreInfusionRemaining] = useState(DEFAULT_PRE_INFUSION_SECONDS);
  const timerRef = useRef(null);
  const phaseRef = useRef('idle');
  // Use refs for accurate timing (avoids stale closures)
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);

  // Results State
  const [actualOutput, setActualOutput] = useState('');
  const [actualTime, setActualTime] = useState(0);
  const [recommendation, setRecommendation] = useState(null);

  // History
  const [history, setHistory] = useState([]);

  // --- Render Logic ---
  const inputWeightTarget = shotType === 'single' ? 9 : 18;
  const targetOutput = inputWeightTarget * TARGET_RATIO;

  const recGrindTime = useMemo(() => {
    const yieldNum = parseFloat(grindYield);
    if (!yieldNum || yieldNum <= 0) return null;
    return ((inputWeightTarget / yieldNum) * grindTime).toFixed(1);
  }, [grindYield, grindTime, inputWeightTarget]);

  // --- Actions ---
  const updatePhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const startTimer = () => {
    setTimerActive(true);
    setElapsedTime(0);
    setPreInfusionRemaining(preInfusionSeconds);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = Date.now();
    updatePhase('preinfusion');
    timerRef.current = setInterval(() => {
      if (phaseRef.current === 'preinfusion') {
        const elapsedPreInfusion = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, preInfusionSeconds - elapsedPreInfusion);
        if (remaining > 0) {
          setPreInfusionRemaining(remaining);
          return;
        }
        setPreInfusionRemaining(0);
        updatePhase('brew');
        startTimeRef.current = Date.now();
        accumulatedTimeRef.current = 0;
        setElapsedTime(0);
        return;
      }
      const elapsed = (Date.now() - startTimeRef.current) / 1000 + accumulatedTimeRef.current;
      setElapsedTime(elapsed);
    }, 30);
  };

  const stopTimer = () => {
    const elapsed = phaseRef.current === 'brew'
      ? (Date.now() - startTimeRef.current) / 1000 + accumulatedTimeRef.current
      : 0;
    setTimerActive(false);
    clearInterval(timerRef.current);
    accumulatedTimeRef.current = elapsed;
    updatePhase('idle');
    setPreInfusionRemaining(preInfusionSeconds);
    setActualTime(elapsed);
    setElapsedTime(elapsed);
  };

  const resetTimer = () => {
    setTimerActive(false);
    clearInterval(timerRef.current);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = null;
    updatePhase('idle');
    setPreInfusionRemaining(preInfusionSeconds);
    setElapsedTime(0);
  };

  const finishPull = () => {
    const elapsed = phaseRef.current === 'brew'
      ? (Date.now() - startTimeRef.current) / 1000 + accumulatedTimeRef.current
      : 0;
    setTimerActive(false);
    clearInterval(timerRef.current);
    accumulatedTimeRef.current = elapsed;
    updatePhase('idle');
    setPreInfusionRemaining(preInfusionSeconds);
    setActualTime(elapsed);
    setElapsedTime(elapsed);
    setActualOutput(targetOutput.toString());
    setStep('analyze');
  };

  const analyzeShot = () => {
    const output = parseFloat(actualOutput);
    const time = actualTime;
    
    let feedback = "";
    let action = "";
    let status = "good";

    if (time < MIN_GOOD_TIME) {
      status = "fast";
      feedback = "TOO FAST. ACIDIC. UNDER-EXTRACTED.";
      action = "GRIND FINER (-) OR INCREASE DOSE (+)";
    } else if (time > MAX_GOOD_TIME) {
      status = "slow";
      feedback = "TOO SLOW. BITTER. OVER-EXTRACTED.";
      action = "GRIND COARSER (+) OR DECREASE DOSE (-)";
    } else {
      status = "perfect";
      feedback = "SOLID SHOT. GOLDEN RATIO HIT.";
      action = "LOCK IT IN. NO CHANGES.";
    }

    const result = {
      id: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: shotType,
      grindSize,
      grindTime: recGrindTime || grindTime,
      inputWeight: inputWeightTarget,
      outputWeight: output,
      extractionTime: time.toFixed(1),
      status,
      feedback,
      action
    };

    setRecommendation(result);
    setHistory(prev => [result, ...prev]);
  };

  const resetWorkflow = () => {
    setStep('setup');
    setElapsedTime(0);
    setActualOutput('');
    setRecommendation(null);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = null;
    updatePhase('idle');
    setPreInfusionRemaining(preInfusionSeconds);
  };

  // --- UI Components ---

  const Header = () => (
    <header className="bg-[#DC143C] text-white p-6 border-b-4 border-[#1A1A1A] mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#1A1A1A] opacity-20 animate-pulse" />
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#1A1A1A] p-2 border border-white shadow-[2px_2px_0px_0px_white]">
            <Coffee size={24} className="text-white" />
          </div>
          <div>
             <h1 className="text-3xl font-['Oswald'] font-black uppercase tracking-tighter leading-none transform -skew-x-6">
              Espresso<br/>Optimizer
            </h1>
            <span className="font-['Courier_New'] text-xs text-[#1A1A1A] bg-[#F0EAD6] px-1 font-bold uppercase">VER. 2.0 // RAW</span>
          </div>
        </div>
        <button 
          onClick={() => setStep('history')}
          className="bg-[#1A1A1A] p-3 border-2 border-white text-white hover:bg-[#F0EAD6] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
          aria-label="View shot history"
        >
          <History size={20} />
        </button>
      </div>
    </header>
  );

  const StepIndicator = () => {
    const steps = ['setup', 'pull', 'analyze'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex === -1) return null;

    return (
      <div className="flex justify-center gap-1 mb-8 px-6">
        {steps.map((s, idx) => (
          <div 
            key={s} 
            className={cn(
              "h-2 flex-1 border border-[#1A1A1A] transition-all duration-300 transform skew-x-12",
              idx <= currentIndex ? "bg-[#1A1A1A]" : "bg-transparent opacity-30"
            )}
          />
        ))}
      </div>
    );
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.9, rotate: -2 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 1.1, rotate: 2 }
  };

  const timerDisplayTime = phase === 'preinfusion' ? preInfusionRemaining : elapsedTime;
  const timerLabel = phase === 'preinfusion' ? 'PRE-INFUSION' : 'SECONDS';
  const timerProgress = phase === 'preinfusion'
    ? (preInfusionSeconds === 0 ? 1 : (preInfusionSeconds - preInfusionRemaining) / preInfusionSeconds)
    : Math.min(elapsedTime, 30) / 30;

  return (
    <div className="min-h-dvh bg-[#F0EAD6] text-[#1A1A1A] font-sans pb-[safe-area-inset-bottom] overflow-x-hidden relative">
      <NoiseOverlay />
      
      <div className="fixed top-20 right-[-20px] font-['Oswald'] text-[12rem] text-[#1A1A1A]/5 font-black pointer-events-none rotate-12 z-0">
        GRIND
      </div>
      <div className="fixed bottom-[-50px] left-[-20px] font-['Oswald'] text-[10rem] text-[#DC143C]/10 font-black pointer-events-none -rotate-6 z-0">
        BREW
      </div>

      <div className="max-w-md mx-auto h-full flex flex-col relative z-10">
        <Header />
        <StepIndicator />

        <main className="px-6 flex-grow flex flex-col pb-12">
          <AnimatePresence mode="wait">
            {step === 'setup' && (
              <motion.div 
                key="setup"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex-grow flex flex-col"
              >
                <SectionHeading>
                   <Settings2 className="text-[#DC143C]" size={32} strokeWidth={2.5} />
                   INITIALIZE
                </SectionHeading>
                
                <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0px_0px_#1A1A1A] space-y-8 relative">
                  <div className="absolute -top-3 -right-3 bg-[#C5A945] px-2 border-2 border-[#1A1A1A] font-['Courier_New'] font-bold text-xs transform rotate-3">
                    REF: BSKT-01
                  </div>

                  <div>
                    <TapeLabel text="SELECT_DOSE" className="mb-2" />
                    <div className="grid grid-cols-2 gap-4">
                      {['single', 'double'].map((type) => (
                        <button 
                          key={type}
                          onClick={() => setShotType(type)}
                          className={cn(
                            "py-4 font-['Oswald'] uppercase tracking-wider font-bold border-2 border-[#1A1A1A] transition-all relative overflow-hidden group",
                            shotType === type 
                              ? "bg-[#1A1A1A] text-white" 
                              : "bg-transparent hover:bg-[#1A1A1A]/10"
                          )}
                        >
                          <span className="relative z-10">{type}</span>
                          <span className="block font-['Courier_New'] text-xs opacity-70 mt-1 z-10 relative">
                             Target: {type === 'single' ? '9' : '18'}g
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-[#1A1A1A] pt-6 space-y-4">
                     <div className="flex items-center gap-2 mb-1">
                        <Calculator size={16} className="text-[#DC143C]" />
                        <span className="font-['Courier_New'] font-bold text-sm">CALIBRATION_MATRIX</span>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-['Courier_New'] font-bold text-xs block mb-1">TEST_TIME (S)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={grindTime}
                            onChange={(e) => setGrindTime(e.target.value)}
                            onBlur={(e) => setGrindTime(parseFloat(e.target.value) || 0)}
                            style={{ fontSize: '16px' }}
                            className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2 font-['Courier_New'] font-bold focus:outline-none focus:ring-2 focus:ring-[#DC143C] tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="font-['Courier_New'] font-bold text-xs block mb-1">TEST_YIELD (G)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={grindYield}
                            onChange={(e) => setGrindYield(e.target.value)}
                            onBlur={(e) => setGrindYield(parseFloat(e.target.value) || 0)}
                            placeholder="0.0"
                            style={{ fontSize: '16px' }}
                            className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2 font-['Courier_New'] font-bold focus:outline-none focus:ring-2 focus:ring-[#DC143C] tabular-nums"
                          />
                        </div>
                     </div>

                     <div>
                       <label className="font-['Courier_New'] font-bold text-xs block mb-1">PRE-INFUSION (S)</label>
                       <input
                         type="text"
                         inputMode="decimal"
                         value={preInfusionSeconds}
                         onChange={(e) => {
                           const next = parseFloat(e.target.value);
                           const value = Number.isFinite(next) ? next : 0;
                           setPreInfusionSeconds(value);
                           if (!timerActive) {
                             setPreInfusionRemaining(value);
                           }
                         }}
                         onBlur={(e) => {
                           const next = parseFloat(e.target.value);
                           const value = Number.isFinite(next) ? next : 0;
                           setPreInfusionSeconds(value);
                           if (!timerActive) {
                             setPreInfusionRemaining(value);
                           }
                         }}
                         style={{ fontSize: '16px' }}
                         className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2 font-['Courier_New'] font-bold focus:outline-none focus:ring-2 focus:ring-[#DC143C] tabular-nums"
                       />
                     </div>

                     {recGrindTime && (
                       <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#C5A945] p-3 border-2 border-[#1A1A1A] flex items-center justify-between"
                       >
                          <span className="font-['Oswald'] text-sm font-bold uppercase">Rec. Time</span>
                          <span className="font-['Courier_New'] text-xl font-black bg-[#1A1A1A] text-white px-2">{recGrindTime}s</span>
                       </motion.div>
                     )}
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <TapeLabel text="GRIND_SETTING" />
                      <span className="text-3xl font-['Oswald'] font-black tabular-nums">{grindSize}</span>
                    </div>
                    <input 
                      type="range" min="1" max="20" step="1" 
                      value={grindSize} onChange={(e) => setGrindSize(parseInt(e.target.value))}
                      className="w-full h-4 bg-[#1A1A1A] appearance-none cursor-pointer border-2 border-[#1A1A1A]"
                      style={{
                        accentColor: '#DC143C'
                      }}
                    />
                    <div className="flex justify-between font-['Courier_New'] text-xs font-bold mt-1 uppercase">
                      <span>Fine [Dust]</span>
                      <span>Coarse [Rock]</span>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1A] p-4 flex items-center justify-between text-white">
                    <div className="text-center">
                       <div className="font-['Courier_New'] text-[10px] uppercase opacity-60">Yield Goal</div>
                       <div className="font-['Oswald'] text-2xl font-bold leading-none">{targetOutput}g</div>
                    </div>
                    <div className="h-8 w-[2px] bg-white opacity-30 rotate-12" />
                    <div className="text-center">
                       <div className="font-['Courier_New'] text-[10px] uppercase opacity-60">Time Goal</div>
                       <div className="font-['Oswald'] text-2xl font-bold leading-none">25-30s</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <GrungeButton onClick={() => setStep('pull')} className="w-full text-xl">
                    ENGAGE EXTRACTION
                  </GrungeButton>
                </div>
              </motion.div>
            )}

            {step === 'pull' && (
              <motion.div 
                key="pull"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex-grow flex flex-col"
              >
                <SectionHeading>
                  <Timer className="text-[#DC143C]" size={32} strokeWidth={2.5} />
                  IN PROGRESS
                </SectionHeading>

                <div className="flex-grow border-4 border-[#1A1A1A] bg-[#1A1A1A] p-6 shadow-[8px_8px_0px_0px_#DC143C] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                     <span className="text-[200px] font-['Oswald'] font-black text-white animate-pulse">
                       {Math.floor(timerDisplayTime)}
                     </span>
                  </div>

                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="relative mb-8">
                       <svg className="w-64 h-64 -rotate-90">
                        <circle cx="128" cy="128" r="120" stroke="#333" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                        <circle cx="128" cy="128" r="110" stroke="#333" strokeWidth="15" fill="none" />
                        <motion.circle
                          cx="128" cy="128" r="110"
                          stroke="#DC143C"
                          strokeWidth="15"
                          fill="none"
                          strokeDasharray={690}
                          initial={{ strokeDashoffset: 690 }}
                          animate={{ strokeDashoffset: 690 - timerProgress * 690 }}
                          transition={{ duration: 0.1 }}
                          strokeLinecap="butt"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                         <span className="font-['Oswald'] text-7xl font-black tracking-tighter tabular-nums">
                            {timerDisplayTime.toFixed(1)}
                         </span>
                         <span className="font-['Courier_New'] text-sm bg-[#DC143C] text-white px-2 font-bold mt-2">{timerLabel}</span>
                         {!timerActive && phase === 'idle' && (
                           <span className="mt-3 font-['Courier_New'] text-xs uppercase tracking-widest text-white/70">
                             PRE-INFUSION: {preInfusionSeconds.toFixed(1)}s
                           </span>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full relative z-10">
                    {!timerActive ? (
                      <GrungeButton onClick={startTimer} variant="primary" className="col-span-2 text-xl">
                        <Play fill="currentColor" size={20} className="inline mr-2" />
                        START
                      </GrungeButton>
                    ) : (
                      <GrungeButton onClick={finishPull} variant="secondary" className="col-span-2 text-xl animate-pulse">
                        <Square fill="currentColor" size={20} className="inline mr-2" />
                        STOP
                      </GrungeButton>
                    )}
                    
                    <GrungeButton 
                      onClick={resetTimer} 
                      disabled={timerActive}
                      variant="black"
                      className="border-2 border-white"
                    >
                      <RotateCcw size={18} color="white" />
                    </GrungeButton>
                    <GrungeButton 
                      onClick={() => setStep('setup')} 
                      disabled={timerActive}
                      variant="black"
                      className="border-2 border-white"
                    >
                      <ArrowLeft size={18} color="white" />
                    </GrungeButton>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'analyze' && (
              <motion.div 
                key="analyze"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex-grow"
              >
                 <SectionHeading>
                  <CheckCircle2 className="text-[#DC143C]" size={32} strokeWidth={2.5} />
                  DEBRIEF
                </SectionHeading>

                {!recommendation ? (
                  <div className="bg-white border-4 border-[#1A1A1A] p-8 shadow-[8px_8px_0px_0px_#1A1A1A] relative">
                     <TapeLabel text="INPUT_DATA" className="absolute -top-3 left-4" />
                     
                     <div className="mb-8">
                        <label className="font-['Courier_New'] font-bold text-sm block mb-2 uppercase">Recorded Output (Grams)</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={actualOutput}
                            onChange={(e) => setActualOutput(e.target.value)}
                            onBlur={(e) => setActualOutput(parseFloat(e.target.value) || '')}
                            placeholder={targetOutput.toString()}
                            style={{ fontSize: '16px' }}
                            className="w-full bg-[#F0EAD6] border-b-4 border-[#1A1A1A] py-4 pl-4 pr-16 font-['Oswald'] font-bold focus:outline-none focus:bg-[#DC143C] focus:text-white transition-colors tabular-nums placeholder:text-[#1A1A1A]/20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-['Courier_New'] font-bold text-sm opacity-50">G</span>
                        </div>
                     </div>

                     <div className="flex justify-between items-center border-2 border-[#1A1A1A] p-4 bg-[#1A1A1A]/5 mb-8">
                        <span className="font-['Courier_New'] font-bold uppercase">Timer Lock</span>
                        <span className="font-['Oswald'] text-2xl font-bold tabular-nums">{actualTime.toFixed(1)}s</span>
                     </div>

                     <GrungeButton onClick={analyzeShot} className="w-full text-xl">
                       RUN ANALYSIS
                     </GrungeButton>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className={cn(
                      "border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0px_0px_#DC143C] relative overflow-hidden",
                      recommendation.status === 'perfect' ? 'bg-[#C5A945]' : 'bg-[#F0EAD6]'
                    )}>
                      <div className="absolute top-4 right-4 border-4 border-[#1A1A1A] p-2 rotate-12 opacity-80 mix-blend-multiply pointer-events-none">
                        <span className="font-['Oswald'] font-black text-xl uppercase tracking-widest text-[#1A1A1A]">
                           {recommendation.status === 'perfect' ? 'APPROVED' : 'REJECTED'}
                        </span>
                      </div>

                      <div className="relative z-10">
                        <h3 className="text-4xl font-['Oswald'] font-black uppercase leading-none mb-2 text-[#1A1A1A] text-balance">
                          {recommendation.status === 'perfect' ? 'PERFECT PULL' : 
                           recommendation.status === 'fast' ? 'TOO FAST' : 'TOO SLOW'}
                        </h3>
                        <p className="font-['Courier_New'] font-bold text-sm bg-[#1A1A1A] text-white inline-block px-2 py-1 mb-6">
                           {recommendation.feedback}
                        </p>

                        <div className="bg-white/50 border-2 border-[#1A1A1A] p-4 transform -rotate-1">
                           <div className="font-['Brush_Script_MT'] text-2xl text-[#DC143C] mb-1">Correction:</div>
                           <div className="font-['Oswald'] text-xl font-bold uppercase leading-tight">
                              {recommendation.action}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#1A1A1A] text-white p-4 border-2 border-[#1A1A1A] text-center">
                         <div className="font-['Courier_New'] text-[10px] uppercase opacity-60">Actual Yield</div>
                         <div className="font-['Oswald'] text-2xl font-bold">{recommendation.outputWeight}g</div>
                      </div>
                      <div className="bg-[#1A1A1A] text-white p-4 border-2 border-[#1A1A1A] text-center">
                         <div className="font-['Courier_New'] text-[10px] uppercase opacity-60">Actual Time</div>
                         <div className="font-['Oswald'] text-2xl font-bold">{recommendation.extractionTime}s</div>
                      </div>
                    </div>

                    <GrungeButton onClick={resetWorkflow} variant="secondary" className="w-full">
                       RESET // NEW SHOT
                    </GrungeButton>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'history' && (
              <motion.div 
                key="history"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex-grow flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                   <SectionHeading>
                      <History className="text-[#DC143C]" size={32} strokeWidth={2.5} />
                      LOGS
                   </SectionHeading>
                   <button onClick={() => setStep('setup')} className="border-2 border-[#1A1A1A] p-2 hover:bg-[#1A1A1A] hover:text-white transition-colors">
                      <X size={24} />
                   </button>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white border-4 border-[#1A1A1A] border-dashed p-12 flex flex-col items-center justify-center text-center opacity-60">
                    <Coffee size={48} className="mb-4 text-[#1A1A1A]" />
                    <p className="font-['Courier_New'] font-bold text-lg uppercase">DATA_MISSING</p>
                    <p className="font-['Courier_New'] text-xs">No extractions recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item, idx) => (
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.id} 
                        className="bg-white border-2 border-[#1A1A1A] p-4 shadow-[4px_4px_0px_0px_#1A1A1A] flex justify-between items-center transform hover:-rotate-1 transition-transform"
                      >
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className={cn(
                                 "w-3 h-3 border border-[#1A1A1A]",
                                 item.status === 'perfect' ? 'bg-[#C5A945]' : 'bg-[#DC143C]'
                               )} />
                               <span className="font-['Oswald'] font-bold uppercase text-lg leading-none">{item.type}</span>
                            </div>
                            <div className="font-['Courier_New'] text-xs font-bold text-[#1A1A1A]/60">
                               {item.date} // {item.grindSize}
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="font-['Oswald'] font-black text-xl leading-none tabular-nums">{item.extractionTime}s</div>
                            <div className="font-['Courier_New'] text-xs font-bold">{item.outputWeight}g</div>
                         </div>
                      </motion.div>
                    ))}
                    
                    <button 
                      onClick={() => setHistory([])}
                      className="w-full py-4 font-['Courier_New'] font-bold text-xs uppercase hover:underline decoration-2 underline-offset-4 decoration-[#DC143C]"
                    >
                      [ PURGE DATABASE ]
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&display=swap');
        
        ::-webkit-scrollbar {
          width: 12px;
        }
        ::-webkit-scrollbar-track {
          background: #F0EAD6;
          border-left: 2px solid #1A1A1A;
        }
        ::-webkit-scrollbar-thumb {
          background: #1A1A1A;
          border: 2px solid #F0EAD6;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #DC143C;
        }

        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 30px;
          background: #DC143C;
          border: 2px solid #1A1A1A;
          cursor: pointer;
          border-radius: 0;
        }

        body::after {
          content: " ";
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%);
          z-index: 20;
          background-size: 100% 4px;
          pointer-events: none;
        }
      `}} />
    </div>
  );
};

export default App;

// Render the app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}