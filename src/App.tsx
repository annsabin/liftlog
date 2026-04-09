/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Home, 
  Settings, 
  History, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Calendar,
  Zap,
  Activity,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { format, differenceInDays, addDays, startOfDay, isSameDay } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { cn } from './lib/utils';
import { 
  WorkoutType, 
  Gym, 
  WorkoutLog, 
  AppState, 
  ExerciseLog, 
  SetLog,
  ExerciseVariation
} from './types';
import { TEN_DAY_PLAN, EXERCISES } from './constants';

// --- Local Storage Helpers ---
const STORAGE_KEY = 'liftlog_coach_state';

const getInitialState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return {
    gyms: [
      { id: 'home', name: 'Home', equipment: { dumbbells: false, barbell: false, machines: false } },
      { id: 'gym-a', name: 'Gym A', equipment: { dumbbells: true, barbell: true, machines: true } }
    ],
    selectedGymId: 'gym-a',
    workoutLogs: [],
    startDate: startOfDay(new Date()).toISOString()
  };
};

// --- Components ---

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-2xl p-6 shadow-sm border border-slate-100", className)} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-100",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-100"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder,
  className 
}: { 
  label?: string; 
  value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  type?: string;
  placeholder?: string;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <label className="text-sm font-medium text-slate-500 ml-1">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [activeScreen, setActiveScreen] = useState<'home' | 'workout' | 'gyms' | 'progress' | 'plan' | 'settings'>('home');
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutLog | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const currentDayIndex = useMemo(() => {
    const today = startOfDay(new Date());
    const start = startOfDay(new Date(state.startDate));
    const diff = differenceInDays(today, start);
    return diff % 10;
  }, [state.startDate]);

  const todayWorkoutType = TEN_DAY_PLAN[currentDayIndex];

  const lastWorkout = useMemo(() => {
    if (state.workoutLogs.length === 0) return null;
    return [...state.workoutLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [state.workoutLogs]);

  const getBestPerformance = (exerciseId: string) => {
    let bestWeight = 0;
    state.workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.exerciseId === exerciseId) {
          ex.sets.forEach(set => {
            if (set.weight > bestWeight) bestWeight = set.weight;
          });
        }
      });
    });
    return bestWeight;
  };

  const getLastPerformance = (exerciseId: string) => {
    const logs = [...state.workoutLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const log of logs) {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        return ex.sets[ex.sets.length - 1];
      }
    }
    return null;
  };

  const startWorkout = () => {
    const gym = state.gyms.find(g => g.id === state.selectedGymId) || state.gyms[0];
    const exercisesForType = EXERCISES[todayWorkoutType] || [];
    
    const initialExercises: ExerciseLog[] = exercisesForType.map(def => {
      // Find suitable variation based on gym equipment
      const variation = def.variations.find(v => {
        if (v.equipment.includes('bodyweight')) return true;
        if (v.equipment.includes('dumbbells') && gym.equipment.dumbbells) return true;
        if (v.equipment.includes('barbell') && gym.equipment.barbell) return true;
        if (v.equipment.includes('machines') && gym.equipment.machines) return true;
        return false;
      }) || def.variations[0];

      return {
        exerciseId: def.id,
        variationId: variation.id,
        sets: [{ id: Math.random().toString(36).substr(2, 9), weight: 0, reps: 0 }]
      };
    });

    setCurrentWorkout({
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: todayWorkoutType,
      gymId: state.selectedGymId,
      exercises: initialExercises
    });
    setActiveScreen('workout');
  };

  const completeWorkout = (checkIn: WorkoutLog['checkIn']) => {
    if (!currentWorkout) return;
    const completedWorkout = { ...currentWorkout, checkIn };
    setState(prev => ({
      ...prev,
      workoutLogs: [...prev.workoutLogs, completedWorkout]
    }));
    setCurrentWorkout(null);
    setActiveScreen('home');
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    if (!currentWorkout) return;
    const newExercises = [...currentWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex] = {
      ...newExercises[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setCurrentWorkout({ ...currentWorkout, exercises: newExercises });
  };

  const addSet = (exerciseIndex: number) => {
    if (!currentWorkout) return;
    const newExercises = [...currentWorkout.exercises];
    const lastSet = newExercises[exerciseIndex].sets[newExercises[exerciseIndex].sets.length - 1];
    newExercises[exerciseIndex].sets.push({
      id: Math.random().toString(36).substr(2, 9),
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0
    });
    setCurrentWorkout({ ...currentWorkout, exercises: newExercises });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!currentWorkout || currentWorkout.exercises[exerciseIndex].sets.length <= 1) return;
    const newExercises = [...currentWorkout.exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    setCurrentWorkout({ ...currentWorkout, exercises: newExercises });
  };

  const substituteExercise = (exerciseIndex: number, variationId: string) => {
    if (!currentWorkout) return;
    const newExercises = [...currentWorkout.exercises];
    newExercises[exerciseIndex].variationId = variationId;
    setCurrentWorkout({ ...currentWorkout, exercises: newExercises });
  };

  const NavItem = ({ screen, icon: Icon, label }: { screen: typeof activeScreen, icon: any, label: string }) => (
    <button 
      onClick={() => { setActiveScreen(screen); setIsMenuOpen(false); }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full",
        activeScreen === screen ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {activeScreen === screen && <motion.div layoutId="active-nav" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Zap size={16} fill="currentColor" />
          </div>
          <h1 className="font-bold text-base tracking-tight">LiftLog Coach</h1>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:flex flex-col w-64 h-full bg-white border-r border-slate-100 p-6 shrink-0">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={22} fill="currentColor" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">LiftLog Coach</h1>
          </div>
          
          <nav className="flex flex-col gap-2 flex-1">
            <NavItem screen="home" icon={Home} label="Dashboard" />
            <NavItem screen="plan" icon={Calendar} label="Training Plan" />
            <NavItem screen="progress" icon={TrendingUp} label="Progress" />
            <NavItem screen="gyms" icon={Dumbbell} label="My Gyms" />
            <NavItem screen="settings" icon={Settings} label="Settings" />
          </nav>

          <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Gym</p>
            <p className="font-bold text-slate-700 truncate">{state.gyms.find(g => g.id === state.selectedGymId)?.name || 'None'}</p>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden fixed inset-0 z-30 bg-white p-6 pt-16 flex flex-col gap-2"
            >
              <NavItem screen="home" icon={Home} label="Dashboard" />
              <NavItem screen="plan" icon={Calendar} label="Training Plan" />
              <NavItem screen="progress" icon={TrendingUp} label="Progress" />
              <NavItem screen="gyms" icon={Dumbbell} label="My Gyms" />
              <NavItem screen="settings" icon={Settings} label="Settings" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto w-full p-4 lg:p-8 pb-24 lg:pb-8">
            <AnimatePresence mode="wait">
              {activeScreen === 'home' && (
                <motion.div 
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4 lg:gap-6"
                >
                  <div className="flex flex-col">
                    <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800 truncate">Welcome back, Ann</h2>
                    <p className="text-slate-500 text-xs lg:text-sm font-medium">{format(new Date(), 'EEEE, MMMM do')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <Card className="bg-indigo-600 text-white border-none shadow-lg shadow-indigo-100 p-4 lg:p-6">
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3 lg:mb-4">
                          <div className="p-1.5 bg-white/20 rounded-lg">
                            <Activity size={16} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Day {currentDayIndex + 1} of 10</span>
                        </div>
                        <h3 className="text-[10px] font-semibold opacity-80 mb-0.5 uppercase tracking-wider">Today's Focus</h3>
                        <p className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-6">{todayWorkoutType}</p>
                        
                        <div className="mt-auto flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Select Gym</label>
                            <select 
                              value={state.selectedGymId}
                              onChange={(e) => setState(prev => ({ ...prev, selectedGymId: e.target.value }))}
                              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/30"
                            >
                              {state.gyms.map(gym => (
                                <option key={gym.id} value={gym.id} className="text-slate-900">{gym.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          {todayWorkoutType !== 'Rest' && todayWorkoutType !== 'Active Recovery' ? (
                            <Button 
                              onClick={startWorkout}
                              className="bg-white text-indigo-600 hover:bg-indigo-50 w-full py-2.5 lg:py-3 text-base lg:text-lg"
                            >
                              Start Workout
                            </Button>
                          ) : (
                            <div className="bg-white/10 rounded-lg p-3 text-center">
                              <p className="text-sm font-medium">Enjoy your {todayWorkoutType.toLowerCase()} day!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>

                    <div className="flex flex-col gap-4 lg:gap-6">
                      <Card className="p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <History size={16} className="text-indigo-500" />
                            Last Session
                          </h3>
                          {lastWorkout && (
                            <span className="text-[10px] font-medium text-slate-400">
                              {format(new Date(lastWorkout.date), 'MMM d')}
                            </span>
                          )}
                        </div>
                        {lastWorkout ? (
                          <div className="flex flex-col gap-2">
                            <p className="text-lg lg:text-xl font-bold text-slate-800">{lastWorkout.type}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Zap size={12} /> {lastWorkout.exercises.length}</span>
                              <span className="flex items-center gap-1 truncate"><Dumbbell size={12} /> {state.gyms.find(g => g.id === lastWorkout.gymId)?.name}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-slate-400 text-xs">No workouts logged yet.</p>
                          </div>
                        )}
                      </Card>

                      <Card className="bg-slate-800 text-white border-none p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-sm flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-400" />
                            Stats
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-xl font-bold">{state.workoutLogs.length}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Streak</span>
                            <span className="text-xl font-bold">3d</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScreen === 'workout' && currentWorkout && (
                <motion.div 
                  key="workout"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-4 lg:gap-6"
                >
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex flex-col">
                      <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{currentWorkout.type}</h2>
                      <p className="text-slate-500 text-xs font-medium">Tracking session</p>
                    </div>
                    <Button variant="outline" onClick={() => { if(confirm('Cancel workout?')) { setCurrentWorkout(null); setActiveScreen('home'); } }} className="px-3 py-1.5 text-xs">
                      Cancel
                    </Button>
                  </div>

                  <div className="flex flex-col gap-4 lg:gap-6">
                    {currentWorkout.exercises.map((exLog, exIdx) => {
                      const def = EXERCISES[currentWorkout.type].find(d => d.id === exLog.exerciseId);
                      const variation = def?.variations.find(v => v.id === exLog.variationId);
                      const lastPerf = getLastPerformance(exLog.exerciseId);
                      const bestWeight = getBestPerformance(exLog.exerciseId);

                      return (
                        <Card key={exLog.exerciseId} className="p-0 overflow-hidden border-slate-200">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{variation?.name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lastPerf && <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">Last: {lastPerf.weight}kg×{lastPerf.reps}</span>}
                                {bestWeight > 0 && <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap">Best: {bestWeight}kg</span>}
                              </div>
                            </div>
                            <select 
                              value={exLog.variationId}
                              onChange={(e) => substituteExercise(exIdx, e.target.value)}
                              className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-indigo-600 focus:outline-none shrink-0"
                            >
                              {def?.variations.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="p-3 lg:p-4 flex flex-col gap-3">
                            <div className="flex flex-nowrap overflow-x-auto gap-3 pb-2 scrollbar-hide">
                              {exLog.sets.map((set, setIdx) => (
                                <motion.div 
                                  layout
                                  key={set.id} 
                                  className="flex flex-col gap-1.5 min-w-[80px] shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-100 relative group"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Set {setIdx + 1}</span>
                                    {exLog.sets.length > 1 && (
                                      <button 
                                        onClick={() => removeSet(exIdx, setIdx)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="number"
                                        value={set.weight || ''}
                                        onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs text-center font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="kg"
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">kg</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="number"
                                        value={set.reps || ''}
                                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs text-center font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="reps"
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">reps</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                              <button 
                                onClick={() => addSet(exIdx)}
                                className="flex flex-col items-center justify-center gap-1 min-w-[80px] shrink-0 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                              >
                                <Plus size={16} />
                                <span className="text-[10px] font-bold uppercase">Add</span>
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Sticky Bottom Action */}
                  <div className="fixed bottom-0 left-0 right-0 lg:absolute lg:bottom-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 lg:bg-transparent lg:border-none lg:p-0 lg:static">
                    <Button 
                      onClick={() => setActiveScreen('settings')} 
                      className="w-full py-3.5 text-lg lg:mt-6"
                    >
                      Complete Workout
                    </Button>
                  </div>

                  <CheckInModal 
                    isOpen={activeScreen === 'settings' && !!currentWorkout} 
                    onClose={() => setActiveScreen('workout')}
                    onComplete={completeWorkout}
                  />
                </motion.div>
              )}

              {activeScreen === 'progress' && (
                <motion.div 
                  key="progress"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4 lg:gap-6"
                >
                  <div className="flex flex-col">
                    <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">Progress Tracking</h2>
                    <p className="text-slate-500 text-xs font-medium">Visualizing your gains over time</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 lg:gap-4">
                    <Card className="flex flex-col items-center justify-center py-4 lg:py-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Workouts</span>
                      <span className="text-xl lg:text-2xl font-black text-indigo-600">{state.workoutLogs.length}</span>
                    </Card>
                    <Card className="flex flex-col items-center justify-center py-4 lg:py-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Energy</span>
                      <span className="text-xl lg:text-2xl font-black text-amber-500">
                        {state.workoutLogs.length > 0 
                          ? (state.workoutLogs.reduce((acc, log) => acc + (log.checkIn?.energy || 0), 0) / state.workoutLogs.length).toFixed(1)
                          : '0.0'}
                      </span>
                    </Card>
                    <Card className="flex flex-col items-center justify-center py-4 lg:py-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Consistency</span>
                      <span className="text-xl lg:text-2xl font-black text-emerald-500">85%</span>
                    </Card>
                  </div>

                  <Card className="p-4 lg:p-6">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 lg:mb-6 flex items-center gap-2">
                      <BarChart3 size={16} className="text-indigo-500" />
                      Volume Over Time
                    </h3>
                    <div className="h-[200px] lg:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={state.workoutLogs.map(log => ({
                          date: format(new Date(log.date), 'MMM d'),
                          volume: log.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0)
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="volume" 
                            stroke="#4f46e5" 
                            strokeWidth={2} 
                            dot={{ r: 3, fill: '#4f46e5', strokeWidth: 1, stroke: '#fff' }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-slate-800 text-sm">Exercise History</h3>
                    <div className="flex flex-col gap-2">
                      {state.workoutLogs.slice().reverse().map(log => (
                        <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-800 truncate">{log.type}</span>
                            <span className="text-[10px] text-slate-400">{format(new Date(log.date), 'MMM do, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Difficulty</span>
                              <span className="text-xs font-medium capitalize">{log.checkIn?.difficulty || 'N/A'}</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScreen === 'plan' && (
                <motion.div 
                  key="plan"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col gap-4 lg:gap-6"
                >
                  <div className="flex flex-col">
                    <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">Training Plan</h2>
                    <p className="text-slate-500 text-xs font-medium">Your 10-day rotation cycle</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                    {TEN_DAY_PLAN.map((type, idx) => {
                      const isToday = idx === currentDayIndex;
                      const date = addDays(new Date(state.startDate), idx + (Math.floor(differenceInDays(new Date(), new Date(state.startDate)) / 10) * 10));
                      
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "relative p-3 lg:p-4 rounded-xl border-2 transition-all flex flex-col justify-between min-h-[100px]",
                            isToday 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 z-10" 
                              : "bg-white border-slate-100 text-slate-800"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                              isToday ? "bg-white/20" : "bg-slate-100 text-slate-500"
                            )}>
                              Day {idx + 1}
                            </span>
                            {isToday && <div className="bg-white text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Today</div>}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold leading-tight mb-1">{type}</h3>
                            <p className={cn("text-[10px] font-medium", isToday ? "text-indigo-100" : "text-slate-400")}>
                              {format(date, 'EEE, MMM do')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Card className="bg-amber-50 border-amber-100 p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-900 text-sm">Plan Reset</h4>
                        <p className="text-xs text-amber-800/70 mt-1">
                          Cycle started on {format(new Date(state.startDate), 'MMMM do')}. 
                          Reset the start date in settings to restart from Day 1.
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeScreen === 'gyms' && (
                <motion.div 
                  key="gyms"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4 lg:gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">My Gyms</h2>
                      <p className="text-slate-500 text-xs font-medium">Manage locations</p>
                    </div>
                    <Button onClick={() => {
                      const newGym: Gym = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: 'New Gym',
                        equipment: { dumbbells: true, barbell: false, machines: false }
                      };
                      setState(prev => ({ ...prev, gyms: [...prev.gyms, newGym] }));
                    }} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      <Plus size={16} /> Add Gym
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    {state.gyms.map(gym => (
                      <Card key={gym.id} className="flex flex-col gap-4 p-4 lg:p-6">
                        <div className="flex items-center justify-between">
                          <Input 
                            value={gym.name}
                            onChange={(e) => {
                              const newGyms = state.gyms.map(g => g.id === gym.id ? { ...g, name: e.target.value } : g);
                              setState(prev => ({ ...prev, gyms: newGyms }));
                            }}
                            className="flex-1 mr-3 h-9 text-sm"
                          />
                          <button 
                            onClick={() => {
                              if (state.gyms.length <= 1) return;
                              setState(prev => ({ ...prev, gyms: prev.gyms.filter(g => g.id !== gym.id) }));
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Equipment</p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {(['dumbbells', 'barbell', 'machines'] as const).map(item => (
                              <label key={item} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-medium text-slate-700 capitalize">{item}</span>
                                <input 
                                  type="checkbox"
                                  checked={gym.equipment[item]}
                                  onChange={(e) => {
                                    const newGyms = state.gyms.map(g => g.id === gym.id ? { 
                                      ...g, 
                                      equipment: { ...g.equipment, [item]: e.target.checked } 
                                    } : g);
                                    setState(prev => ({ ...prev, gyms: newGyms }));
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeScreen === 'settings' && !currentWorkout && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4 lg:gap-6"
                >
                  <div className="flex flex-col">
                    <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">Settings</h2>
                    <p className="text-slate-500 text-xs font-medium">App configuration</p>
                  </div>

                  <Card className="flex flex-col gap-4 p-4 lg:p-6">
                    <h3 className="font-bold text-slate-800 text-sm">Plan Configuration</h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Cycle Start Date</label>
                        <input 
                          type="date"
                          value={format(new Date(state.startDate), 'yyyy-MM-dd')}
                          onChange={(e) => setState(prev => ({ ...prev, startDate: new Date(e.target.value).toISOString() }))}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">This date determines which day of the 10-day plan you are on today.</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-rose-100 bg-rose-50/30 p-4 lg:p-6">
                    <h3 className="font-bold text-rose-800 text-sm mb-2">Danger Zone</h3>
                    <p className="text-xs text-rose-700/70 mb-4">Deleting your data is permanent. Please be certain.</p>
                    <Button 
                      variant="danger" 
                      onClick={() => {
                        if (confirm('Are you absolutely sure? This will delete all your workout history.')) {
                          localStorage.removeItem(STORAGE_KEY);
                          window.location.reload();
                        }
                      }}
                      className="w-full sm:w-auto py-2 text-sm"
                    >
                      Clear All Data
                    </Button>
                  </Card>

                  <div className="text-center py-6">
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">LiftLog Coach v1.0.0</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden shrink-0 bg-white border-t border-slate-100 px-6 py-2 flex items-center justify-between z-40">
        <NavIconButton active={activeScreen === 'home'} onClick={() => setActiveScreen('home')} icon={Home} />
        <NavIconButton active={activeScreen === 'plan'} onClick={() => setActiveScreen('plan')} icon={Calendar} />
        <NavIconButton active={activeScreen === 'progress'} onClick={() => setActiveScreen('progress')} icon={TrendingUp} />
        <NavIconButton active={activeScreen === 'gyms'} onClick={() => setActiveScreen('gyms')} icon={Dumbbell} />
        <NavIconButton active={activeScreen === 'settings'} onClick={() => setActiveScreen('settings')} icon={Settings} />
      </nav>
    </div>
  );
}

function NavIconButton({ active, onClick, icon: Icon }: { active: boolean, onClick: () => void, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl transition-all relative",
        active ? "text-indigo-600" : "text-slate-400"
      )}
    >
      <Icon size={24} />
      {active && (
        <motion.div 
          layoutId="bottom-nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600"
        />
      )}
    </button>
  );
}

function CheckInModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onComplete: (checkIn: WorkoutLog['checkIn']) => void;
}) {
  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState(1);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl"
      >
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Great Work!</h3>
        <p className="text-slate-500 mb-8">How are you feeling after this session?</p>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Energy Level</label>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map(val => (
                <button 
                  key={val}
                  onClick={() => setEnergy(val)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all",
                    energy === val ? "bg-amber-400 text-white shadow-lg shadow-amber-100" : "bg-slate-50 text-slate-400"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Muscle Soreness</label>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map(val => (
                <button 
                  key={val}
                  onClick={() => setSoreness(val)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all",
                    soreness === val ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-400"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map(val => (
                <button 
                  key={val}
                  onClick={() => setDifficulty(val)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all capitalize",
                    difficulty === val ? "bg-slate-800 text-white shadow-lg shadow-slate-100" : "bg-slate-50 text-slate-400"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => onComplete({ energy, soreness, difficulty })} className="w-full py-4 text-lg">
              Save & Finish
            </Button>
            <button onClick={onClose} className="text-slate-400 font-semibold text-sm py-2">
              Go back to workout
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
