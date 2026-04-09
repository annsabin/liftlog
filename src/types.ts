export type WorkoutType = 'Lower' | 'Upper' | 'Cardio/Core' | 'Active Recovery' | 'Rest';

export interface ExerciseVariation {
  id: string;
  name: string;
  equipment: ('dumbbells' | 'barbell' | 'machines' | 'bodyweight')[];
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  variations: ExerciseVariation[];
}

export interface Gym {
  id: string;
  name: string;
  equipment: {
    dumbbells: boolean;
    barbell: boolean;
    machines: boolean;
  };
}

export interface SetLog {
  id: string;
  weight: number;
  reps: number;
}

export interface ExerciseLog {
  exerciseId: string;
  variationId: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO string
  type: WorkoutType;
  gymId: string;
  exercises: ExerciseLog[];
  checkIn?: {
    energy: number; // 1-5
    soreness: number; // 1-5
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface AppState {
  gyms: Gym[];
  selectedGymId: string;
  workoutLogs: WorkoutLog[];
  startDate: string; // The date when Day 1 of the 10-day plan started
}
