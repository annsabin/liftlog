export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
  description?: string;
}

export interface WorkoutDayExercise {
  id: string;
  workout_day_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  sequence_order: number;
}

export interface WorkoutDayOverride {
  id: string;
  date: string;
  workout_day_id?: string;
  is_rest_day: boolean;
  custom_day_name?: string;
  created_at: string;
}

export interface WorkoutExerciseOverride {
  id: string;
  date: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  sequence_order: number;
  notes?: string;
  created_at: string;
  action?: 'add' | 'remove' | 'replace' | 'edit';
  new_exercise_name?: string;
  weight_text?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_day_id: string;
  session_date: string;
  gym_name: string;
  completed: boolean;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  programmed_exercise_name: string;
  performed_exercise_name: string;
  modification_note?: string;
  sequence_order: number;
  created_at: string;
}

export interface SetLog {
  id: string;
  exercise_log_id: string;
  set_number: number;
  weight: number;
  reps: number;
  notes?: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  session_id: string;
  energy: number;
  soreness: number;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}
