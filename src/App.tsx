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
  X,
  AlertCircle,
  LogOut,
  User,
  Edit3,
  ArrowLeft,
  RotateCcw,
  Play
} from 'lucide-react';
import { format, addDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { 
  WorkoutDay, 
  WorkoutDayExercise, 
  WorkoutSession, 
  ExerciseLog, 
  SetLog,
  CheckIn,
  WorkoutDayOverride,
  WorkoutExerciseOverride
} from './types';

// --- Utility Functions ---

function toLocalDateOnly(dateInput: Date | string) {
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const [y, m, d] = dateInput.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatLocalYYYYMMDD(dateInput: Date | string) {
  const d = toLocalDateOnly(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Core Data Logic ---

async function getWorkoutDetailForDate(selectedDate: Date, userId: string | null) {
  if (!userId) return null;
  const dateKey = formatLocalYYYYMMDD(selectedDate);

  try {
    const { data, error } = await supabase.rpc('get_resolved_workout_for_date', { input_date: dateKey });
    
    console.log("RPC result:", data);
    console.log("RPC error:", error);

    if (error) {
      console.error('[LiftLog] RPC error:', error);
      return {
        workout_date: dateKey,
        workout_day_name: 'Error Loading',
        is_error: true,
        exercises: [],
        has_overrides: false
      };
    }

    if (!data || data.length === 0) {
      return {
        workout_date: dateKey,
        workout_day_name: 'Rest Day',
        is_rest_day: true,
        exercises: [],
        has_overrides: false
      };
    }

    // If ANY row has is_rest_day = true, display "Rest Day"
    const isRestDay = data.some((row: any) => row.is_rest_day);
    if (isRestDay) {
      return {
        workout_date: dateKey,
        workout_day_name: 'Rest Day',
        is_rest_day: true,
        exercises: [],
        has_overrides: false
      };
    }

    // Use the FIRST row to get workout_day_name and category
    const firstRow = data[0];
    const workoutDayName = firstRow.workout_day_name;
    const category = firstRow.category;
    const workoutDayId = firstRow.workout_day_id;

    // Render ALL rows (sorted by sort_order) as the exercise list
    const exercises = data.map((row: any) => ({
      exercise_name: row.exercise_name,
      target_sets: row.target_sets || 3,
      target_reps: row.target_reps || '10',
      notes: row.notes || '',
      sequence_order: row.sort_order || 0,
      is_overridden: row.exercise_source === 'override'
    }));

    return {
      workout_date: dateKey,
      workout_day_id: workoutDayId,
      workout_day_name: workoutDayName || 'Workout Day',
      workout_day_category: category,
      is_rest_day: false,
      exercises: exercises,
      has_overrides: data.some((row: any) => row.exercise_source === 'override')
    };
  } catch (err) {
    console.error('[LiftLog] Critical error in getWorkoutDetailForDate:', err);
    return {
      workout_date: dateKey,
      workout_day_name: 'Error Loading',
      is_error: true,
      exercises: [],
      has_overrides: false
    };
  }
}

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
  disabled,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
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
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md flex items-center justify-center gap-2",
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
  className,
  required
}: { 
  label?: string; 
  value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  type?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <label className="text-sm font-medium text-slate-500 ml-1">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
    />
  </div>
);

// --- Auth Component ---

function Auth({ onAuthSuccess }: { onAuthSuccess: (userId: string) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) onAuthSuccess(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onAuthSuccess(data.user.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md w-full p-8 shadow-xl">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Zap size={32} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">LiftLog Coach</h1>
          <p className="text-slate-500 text-sm font-medium">{isSignUp ? 'Create your account' : 'Sign in to your account'}</p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <Input 
            label="Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com" 
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••" 
            required 
          />
          
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-xs font-medium border border-rose-100">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'home' | 'calendar' | 'workout' | 'progress' | 'settings'>('home');
  const [loading, setLoading] = useState(true);
  const [workoutDetail, setWorkoutDetail] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [activeExerciseLogs, setActiveExerciseLogs] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<any[]>([]);
  const [bestPerformances, setBestPerformances] = useState<Record<string, any>>({});

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      fetchInitialData(user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchInitialData = async (uid: string) => {
    setLoading(true);
    try {
      const detail = await getWorkoutDetailForDate(new Date(), uid);
      setWorkoutDetail(detail);

      // Fetch upcoming workouts (next 4 days)
      const upcoming = [];
      for (let i = 1; i <= 4; i++) {
        const futureDate = addDays(new Date(), i);
        const futureDetail = await getWorkoutDetailForDate(futureDate, uid);
        if (futureDetail) {
          upcoming.push(futureDetail);
        }
      }
      setUpcomingWorkouts(upcoming);

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*, workout_days(*), check_ins(*)')
        .eq('user_id', uid)
        .eq('completed', true)
        .order('session_date', { ascending: false });
      
      setAllSessions(sessions || []);

      // Fetch best performances
      const { data: bestSets } = await supabase
        .from('set_logs')
        .select('*, exercise_logs(programmed_exercise_name, session_id)')
        .order('weight', { ascending: false });
      
      const bests: Record<string, any> = {};
      bestSets?.forEach((set: any) => {
        const name = set.exercise_logs.programmed_exercise_name;
        if (!bests[name] || set.weight > bests[name].weight) {
          bests[name] = set;
        }
      });
      setBestPerformances(bests);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setActiveScreen('home');
  };

  const loadWorkoutForDate = async (date: Date) => {
    if (!userId) return;
    setLoading(true);
    try {
      const detail = await getWorkoutDetailForDate(date, userId);
      setWorkoutDetail(detail);
    } catch (err) {
      console.error('Error loading workout:', err);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = async (detail: any) => {
    if (!userId || detail.is_rest_day) return;

    setLoading(true);
    try {
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          workout_day_id: detail.workout_day_id,
          session_date: detail.workout_date,
          gym_name: 'Main Gym',
          completed: false
        })
        .select()
        .single();

      if (session) {
        setCurrentSession(session);
        const logs = detail.exercises.map((ex: any, idx: number) => ({
          programmed_exercise_name: ex.exercise_name,
          performed_exercise_name: ex.exercise_name,
          sequence_order: idx,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          sets: Array.from({ length: ex.target_sets }).map((_, sIdx) => ({
            set_number: sIdx + 1,
            weight: 0,
            reps: parseInt(ex.target_reps) || 0,
            notes: ''
          }))
        }));
        setActiveExerciseLogs(logs);
        setActiveScreen('workout');
        setIsDayDetailOpen(false);
      }
    } catch (err) {
      console.error('Error starting workout:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRestDay = async (date: Date) => {
    if (!userId) return;
    const dateKey = formatLocalYYYYMMDD(date);
    await supabase.from('workout_day_overrides').upsert({
      user_id: userId,
      date: dateKey,
      is_rest_day: true,
      custom_day_name: 'Rest Day'
    }, { onConflict: 'user_id,date' });
    loadWorkoutForDate(date);
  };

  const restorePlan = async (date: Date) => {
    if (!userId) return;
    const dateKey = formatLocalYYYYMMDD(date);
    await supabase.from('workout_day_overrides').delete().eq('date', dateKey).eq('user_id', userId);
    await supabase.from('workout_exercise_overrides').delete().eq('date', dateKey).eq('user_id', userId);
    loadWorkoutForDate(date);
  };

  const saveExerciseOverrides = async (date: Date, exercises: any[]) => {
    if (!userId) return;
    const dateKey = formatLocalYYYYMMDD(date);
    setLoading(true);
    try {
      // 1. Delete ALL existing exercise overrides for this date
      await supabase.from('workout_exercise_overrides').delete().eq('date', dateKey).eq('user_id', userId);
      
      // 2. Insert the new set of exercises as overrides
      const overrides = exercises.map((ex, idx) => ({
        user_id: userId,
        date: dateKey,
        exercise_name: ex.exercise_name,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        sequence_order: idx,
        notes: ex.notes || ''
      }));

      if (overrides.length > 0) {
        const { error } = await supabase.from('workout_exercise_overrides').insert(overrides);
        if (error) throw error;
      }

      // 3. Ensure is_rest_day is false if we have exercises
      await supabase.from('workout_day_overrides').upsert({
        user_id: userId,
        date: dateKey,
        is_rest_day: false
      }, { onConflict: 'user_id,date' });

      setIsEditMode(false);
      await loadWorkoutForDate(date);
    } catch (err) {
      console.error('Error saving overrides:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeWorkout = async () => {
    if (!currentSession || !userId) return;
    setLoading(true);
    try {
      for (const exLog of activeExerciseLogs) {
        const { data: savedExLog } = await supabase
          .from('exercise_logs')
          .insert({
            session_id: currentSession.id,
            programmed_exercise_name: exLog.programmed_exercise_name,
            performed_exercise_name: exLog.performed_exercise_name,
            sequence_order: exLog.sequence_order
          })
          .select()
          .single();

        if (savedExLog) {
          const setLogs = exLog.sets.map((s: any) => ({
            exercise_log_id: savedExLog.id,
            set_number: s.set_number,
            weight: s.weight,
            reps: s.reps,
            notes: s.notes
          }));
          await supabase.from('set_logs').insert(setLogs);
        }
      }

      await supabase
        .from('workout_sessions')
        .update({ completed: true })
        .eq('id', currentSession.id);

      setCurrentSession(null);
      setActiveExerciseLogs([]);
      setActiveScreen('home');
      fetchInitialData(userId);
    } catch (err) {
      console.error('Error completing workout:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <Auth onAuthSuccess={(id) => { setUserId(id); fetchInitialData(id); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Zap size={18} fill="currentColor" />
          </div>
          <h1 className="font-bold text-xl tracking-tight hidden sm:block">LiftLog Coach</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveScreen('settings')}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={handleSignOut}
            className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full pb-24 sm:pb-6">
        <AnimatePresence mode="wait">
          {activeScreen === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dashboard</h2>
                <p className="text-slate-500 text-sm font-medium">{format(new Date(), 'EEEE, MMMM do')}</p>
              </div>

              {/* Today's Plan Card */}
              <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                  <Dumbbell size={120} />
                </div>
                
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold uppercase tracking-widest">
                    <Activity size={14} />
                    Today's Plan
                  </div>
                  
                  <div className="flex flex-col">
                    <h3 className="text-3xl font-bold flex items-center gap-2">
                      {loading ? 'Loading...' : (workoutDetail?.workout_day_name || 'Rest Day')}
                      {workoutDetail?.is_error && <AlertCircle size={24} className="text-rose-300" />}
                    </h3>
                    {workoutDetail?.workout_day_category && (
                      <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mt-0.5">
                        {workoutDetail.workout_day_category}
                      </p>
                    )}
                    {!workoutDetail?.is_rest_day && (
                      <p className="text-indigo-100 text-sm font-medium mt-1">
                        {workoutDetail?.exercises?.length || 0} exercises scheduled
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2">
                    {!workoutDetail?.is_rest_day ? (
                      <>
                        <Button 
                          onClick={() => startWorkout(workoutDetail)}
                          className="bg-white text-indigo-600 hover:bg-indigo-50 border-none px-8"
                        >
                          <Play size={18} fill="currentColor" />
                          Start Workout
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => { setSelectedDate(new Date()); setIsDayDetailOpen(true); }}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          View Details
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => { setSelectedDate(new Date()); setIsDayDetailOpen(true); }}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        Manage Plan
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Upcoming Workouts */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    Upcoming Workouts
                  </h4>
                  <button onClick={() => setActiveScreen('calendar')} className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Full Calendar</button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {upcomingWorkouts.map((workout, idx) => (
                    <button 
                      key={idx}
                      onClick={() => {
                        setSelectedDate(parseISO(workout.workout_date));
                        setWorkoutDetail(workout);
                        setIsDayDetailOpen(true);
                      }}
                      className="flex flex-col gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all text-left group"
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {format(parseISO(workout.workout_date), 'EEE, MMM do')}
                      </span>
                      <span className={cn(
                        "text-sm font-bold truncate group-hover:text-indigo-600 transition-colors",
                        workout.is_error ? "text-rose-500" : workout.is_rest_day ? "text-slate-400" : "text-slate-700"
                      )}>
                        {workout.workout_day_name}
                      </span>
                      {!workout.is_rest_day && (
                        <span className="text-[9px] font-medium text-slate-400">
                          {workout.exercises.length} exercises
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <History size={18} className="text-indigo-600" />
                      Recent Session
                    </h4>
                    <button onClick={() => setActiveScreen('progress')} className="text-xs font-bold text-indigo-600 uppercase tracking-wider">View All</button>
                  </div>
                  
                  {allSessions.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{allSessions[0].workout_days?.name || 'Workout'}</span>
                          <span className="text-[10px] font-medium text-slate-400">{format(parseISO(allSessions[0].session_date), 'MMM do, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {allSessions[0].check_ins?.[0] && (
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              allSessions[0].check_ins[0].difficulty === 'hard' ? "bg-rose-100 text-rose-600" :
                              allSessions[0].check_ins[0].difficulty === 'medium' ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {allSessions[0].check_ins[0].difficulty}
                            </span>
                          )}
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic py-4 text-center">No sessions logged yet.</p>
                  )}
                </Card>

                <Card className="flex flex-col gap-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600" />
                    Quick Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Workouts</span>
                      <span className="text-2xl font-black text-slate-800">{allSessions.length}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Streak</span>
                      <span className="text-2xl font-black text-slate-800">3 days</span>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeScreen === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Calendar</h2>
                    <p className="text-slate-500 text-sm font-medium">Manage your training schedule</p>
                  </div>
                </div>
              </div>

              <Card className="p-4">
                <CalendarView 
                  userId={userId}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    loadWorkoutForDate(date);
                    setIsDayDetailOpen(true);
                  }}
                />
              </Card>
            </motion.div>
          )}

          {activeScreen === 'progress' && (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Progress</h2>
                <p className="text-slate-500 text-sm font-medium">Your fitness journey in data</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card className="p-6">
                  <h4 className="font-bold text-slate-800 mb-6">Workout Frequency</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={allSessions.slice(0, 7).reverse().map(s => ({ date: format(parseISO(s.session_date), 'MM/dd'), count: 1 }))}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-bold text-slate-800 mb-4">Best Performances</h4>
                  <div className="flex flex-col gap-3">
                    {Object.entries(bestPerformances).map(([name, set]: [string, any]) => (
                      <div key={name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{name}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Personal Best</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-indigo-600">{set.weight} lb</span>
                          <span className="text-[10px] font-bold text-slate-400">{set.reps} reps</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-bold text-slate-800 mb-4">Session History</h4>
                  <div className="flex flex-col gap-3">
                    {allSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <History size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{session.workout_days?.name || 'Workout'}</span>
                            <span className="text-[10px] font-medium text-slate-400">{format(parseISO(session.session_date), 'EEEE, MMMM do')}</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeScreen === 'workout' && (
            <motion.div 
              key="workout"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-800">Active Workout</h2>
                  <p className="text-slate-500 text-sm font-medium">{workoutDetail?.workout_day_name}</p>
                </div>
                <div className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold animate-pulse">
                  In Progress
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {activeExerciseLogs.map((exLog, exIdx) => (
                  <Card key={exIdx} className="p-0 overflow-hidden border-2 border-slate-100">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Exercise {exIdx + 1}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exLog.target_sets} Sets • {exLog.target_reps} Reps</span>
                      </div>
                      <input 
                        className="text-lg font-bold bg-transparent border-none p-0 focus:ring-0 w-full text-slate-800"
                        value={exLog.performed_exercise_name}
                        onChange={(e) => {
                          const newLogs = [...activeExerciseLogs];
                          newLogs[exIdx].performed_exercise_name = e.target.value;
                          setActiveExerciseLogs(newLogs);
                        }}
                      />
                      <p className="text-[10px] text-slate-400 font-medium italic">Programmed: {exLog.programmed_exercise_name}</p>
                    </div>

                    <div className="p-4 flex flex-col gap-4">
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                        <span>Set</span>
                        <span>Weight (lb)</span>
                        <span>Reps</span>
                        <span className="text-right">Action</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {exLog.sets.map((set: any, sIdx: number) => (
                          <div key={sIdx} className="grid grid-cols-4 gap-2 items-center">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600">
                              {set.set_number}
                            </div>
                            <input 
                              type="number"
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                              value={set.weight || ''}
                              onChange={(e) => {
                                const newLogs = [...activeExerciseLogs];
                                newLogs[exIdx].sets[sIdx].weight = parseFloat(e.target.value) || 0;
                                setActiveExerciseLogs(newLogs);
                              }}
                            />
                            <input 
                              type="number"
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                              value={set.reps || ''}
                              onChange={(e) => {
                                const newLogs = [...activeExerciseLogs];
                                newLogs[exIdx].sets[sIdx].reps = parseInt(e.target.value) || 0;
                                setActiveExerciseLogs(newLogs);
                              }}
                            />
                            <div className="flex justify-end">
                              <button 
                                onClick={() => {
                                  const newLogs = [...activeExerciseLogs];
                                  newLogs[exIdx].sets.splice(sIdx, 1);
                                  setActiveExerciseLogs(newLogs);
                                }}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button 
                        variant="outline" 
                        className="py-2 text-xs border-dashed"
                        onClick={() => {
                          const newLogs = [...activeExerciseLogs];
                          const lastSet = newLogs[exIdx].sets[newLogs[exIdx].sets.length - 1];
                          newLogs[exIdx].sets.push({
                            set_number: newLogs[exIdx].sets.length + 1,
                            weight: lastSet?.weight || 0,
                            reps: lastSet?.reps || 0,
                            notes: ''
                          });
                          setActiveExerciseLogs(newLogs);
                        }}
                      >
                        <Plus size={14} />
                        Add Set
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="sticky bottom-4 left-0 right-0 flex flex-col gap-3 px-4 sm:px-0">
                <Button onClick={completeWorkout} className="w-full py-4 text-lg shadow-2xl">
                  <CheckCircle2 size={20} />
                  Complete Workout
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => { if(confirm('Cancel workout?')) setActiveScreen('home'); }}
                  className="text-slate-400"
                >
                  Cancel Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation (Mobile) */}
      {activeScreen !== 'workout' && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between z-40">
          <NavIconButton active={activeScreen === 'home'} onClick={() => setActiveScreen('home')} icon={Home} label="Home" />
          <NavIconButton active={activeScreen === 'calendar'} onClick={() => setActiveScreen('calendar')} icon={Calendar} label="Calendar" />
          <NavIconButton active={activeScreen === 'progress'} onClick={() => setActiveScreen('progress')} icon={TrendingUp} label="Stats" />
          <NavIconButton active={activeScreen === 'settings'} onClick={() => setActiveScreen('settings')} icon={User} label="Me" />
        </nav>
      )}

      {/* Day Detail Modal */}
      <DayDetailModal 
        isOpen={isDayDetailOpen}
        onClose={() => { setIsDayDetailOpen(false); setIsEditMode(false); }}
        date={selectedDate}
        detail={workoutDetail}
        loading={loading}
        isEditMode={isEditMode}
        onEditToggle={() => setIsEditMode(!isEditMode)}
        onMarkRestDay={() => markRestDay(selectedDate)}
        onRestorePlan={() => restorePlan(selectedDate)}
        onStartWorkout={() => startWorkout(workoutDetail)}
        onSaveOverrides={(exercises) => saveExerciseOverrides(selectedDate, exercises)}
      />
    </div>
  );
}

function NavIconButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-indigo-600" : "text-slate-400"
      )}
    >
      <Icon size={20} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function CalendarView({ onDateSelect, userId }: { onDateSelect: (date: Date) => void, userId: string | null }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState<Record<string, any>>({});
  const [loadingMonth, setLoadingMonth] = useState(false);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  useEffect(() => {
    if (userId) {
      fetchMonthData();
    }
  }, [currentMonth, userId]);

  const fetchMonthData = async () => {
    setLoadingMonth(true);
    const data: Record<string, any> = {};
    // Fetch in chunks to avoid overwhelming Supabase if needed, but 30 is usually fine
    await Promise.all(days.map(async (day) => {
      const detail = await getWorkoutDetailForDate(day, userId);
      if (detail) {
        data[detail.workout_date] = detail;
      }
    }));
    setMonthData(data);
    setLoadingMonth(false);
  };

  // Add padding for first day
  const firstDayIdx = start.getDay();
  const padding = Array.from({ length: firstDayIdx }).map((_, i) => null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h4>
          {loadingMonth && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={18} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-2">{d}</div>
        ))}
        {padding.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const isTodayDate = isToday(day);
          const dateKey = formatLocalYYYYMMDD(day);
          const dayDetail = monthData[dateKey];

          return (
            <button 
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border border-transparent overflow-hidden p-1",
                isTodayDate ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "hover:bg-slate-50 hover:border-slate-100"
              )}
            >
              <span className="text-sm font-bold">{format(day, 'd')}</span>
              {dayDetail && (
                <div className="flex flex-col items-center w-full">
                  <span className={cn(
                    "text-[7px] font-bold truncate w-full text-center leading-tight uppercase tracking-tighter",
                    isTodayDate ? "text-indigo-100" : dayDetail.is_rest_day ? "text-slate-300" : dayDetail.is_error ? "text-rose-500" : "text-indigo-500"
                  )}>
                    {dayDetail.workout_day_name}
                  </span>
                  {dayDetail.workout_day_category && !isTodayDate && (
                    <span className="text-[6px] text-slate-400 truncate w-full text-center leading-none">
                      {dayDetail.workout_day_category}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDetailModal({ 
  isOpen, 
  onClose, 
  date, 
  detail, 
  loading, 
  isEditMode,
  onEditToggle,
  onMarkRestDay,
  onRestorePlan,
  onStartWorkout,
  onSaveOverrides
}: any) {
  const [editedExercises, setEditedExercises] = useState<any[]>([]);

  useEffect(() => {
    if (detail?.exercises) {
      setEditedExercises([...detail.exercises]);
    }
  }, [detail]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-slate-800">
              {loading ? 'Loading...' : (detail?.workout_day_name || 'Rest Day')}
            </h3>
            <p className="text-slate-500 text-xs font-medium">
              {format(date, 'EEEE, MMMM do')}
              {detail?.workout_day_category && <span className="ml-2 text-indigo-500 font-bold">• {detail.workout_day_category}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Fetching plan details...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exercise List</h4>
                  {detail?.has_overrides && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider">Modified</span>
                  )}
                </div>

                {detail?.is_error ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-rose-50 rounded-3xl border border-dashed border-rose-200">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                      <AlertCircle size={24} />
                    </div>
                    <p className="text-sm text-rose-500 font-bold">
                      Failed to load workout plan.
                    </p>
                  </div>
                ) : !detail?.is_rest_day && editedExercises.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {editedExercises.map((ex, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                        {isEditMode ? (
                          <div className="flex flex-col gap-3">
                            <Input 
                              label="Exercise Name"
                              value={ex.exercise_name}
                              onChange={(e) => {
                                const newEx = [...editedExercises];
                                newEx[idx].exercise_name = e.target.value;
                                setEditedExercises(newEx);
                              }}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <Input 
                                label="Sets"
                                type="number"
                                value={ex.target_sets}
                                onChange={(e) => {
                                  const newEx = [...editedExercises];
                                  newEx[idx].target_sets = parseInt(e.target.value) || 0;
                                  setEditedExercises(newEx);
                                }}
                              />
                              <Input 
                                label="Reps"
                                value={ex.target_reps}
                                onChange={(e) => {
                                  const newEx = [...editedExercises];
                                  newEx[idx].target_reps = e.target.value;
                                  setEditedExercises(newEx);
                                }}
                              />
                            </div>
                            <Button 
                              variant="ghost" 
                              className="text-rose-500 py-2 text-xs"
                              onClick={() => {
                                const newEx = editedExercises.filter((_, i) => i !== idx);
                                setEditedExercises(newEx);
                              }}
                            >
                              <Trash2 size={14} /> Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">{ex.exercise_name}</span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{ex.target_sets} Sets • {ex.target_reps} Reps</span>
                              {ex.notes && <span className="text-[10px] text-slate-400 italic mt-1">{ex.notes}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isEditMode && (
                      <Button 
                        variant="outline" 
                        className="border-dashed py-3"
                        onClick={() => setEditedExercises([...editedExercises, { exercise_name: 'New Exercise', target_sets: 3, target_reps: '10' }])}
                      >
                        <Plus size={16} /> Add Exercise
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm">
                      <Zap size={24} />
                    </div>
                    <p className="text-sm text-slate-400 font-medium italic">
                      {detail?.is_rest_day ? 'Enjoy your rest day!' : 'No exercises scheduled.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          {!loading && (
            <>
              {isEditMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={onEditToggle}>Cancel</Button>
                  <Button onClick={() => onSaveOverrides(editedExercises)}>Save Changes</Button>
                </div>
              ) : (
                <>
                  {!detail?.is_rest_day && (
                    <Button onClick={onStartWorkout} className="w-full py-4 text-lg">
                      <Play size={18} fill="currentColor" />
                      Start Workout
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={onEditToggle} className="text-sm">
                      <Edit3 size={16} />
                      Edit Plan
                    </Button>
                    <Button variant="outline" onClick={onMarkRestDay} className="text-sm">
                      <Activity size={16} />
                      {detail?.is_rest_day ? 'Set Workout' : 'Mark Rest'}
                    </Button>
                  </div>
                  {detail?.has_overrides && (
                    <Button variant="ghost" onClick={onRestorePlan} className="text-rose-500 text-xs py-2">
                      <RotateCcw size={14} />
                      Restore Original Plan
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
