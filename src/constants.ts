import { WorkoutType, ExerciseDefinition } from './types';

export const TEN_DAY_PLAN: WorkoutType[] = [
  'Lower',
  'Upper',
  'Cardio/Core',
  'Lower',
  'Upper',
  'Active Recovery',
  'Rest',
  'Lower',
  'Upper',
  'Cardio/Core', // Day 10 is Cardio/Core based on user request (Cardio)
];

export const EXERCISES: Record<string, ExerciseDefinition[]> = {
  'Lower': [
    {
      id: 'squat',
      name: 'Squat',
      variations: [
        { id: 'barbell-squat', name: 'Barbell Squat', equipment: ['barbell'] },
        { id: 'goblet-squat', name: 'Goblet Squat', equipment: ['dumbbells'] },
        { id: 'leg-press', name: 'Leg Press', equipment: ['machines'] },
        { id: 'bodyweight-squat', name: 'Bodyweight Squat', equipment: ['bodyweight'] },
      ]
    },
    {
      id: 'rdl',
      name: 'Romanian Deadlift',
      variations: [
        { id: 'barbell-rdl', name: 'Barbell RDL', equipment: ['barbell'] },
        { id: 'dumbbell-rdl', name: 'Dumbbell RDL', equipment: ['dumbbells'] },
        { id: 'leg-curl', name: 'Leg Curl Machine', equipment: ['machines'] },
      ]
    },
    {
      id: 'lunges',
      name: 'Lunges',
      variations: [
        { id: 'dumbbell-lunges', name: 'Dumbbell Lunges', equipment: ['dumbbells'] },
        { id: 'bodyweight-lunges', name: 'Bodyweight Lunges', equipment: ['bodyweight'] },
      ]
    },
    {
      id: 'glute-bridge',
      name: 'Glute Bridge / Hip Thrust',
      variations: [
        { id: 'barbell-hip-thrust', name: 'Barbell Hip Thrust', equipment: ['barbell'] },
        { id: 'dumbbell-glute-bridge', name: 'Dumbbell Glute Bridge', equipment: ['dumbbells'] },
        { id: 'bodyweight-glute-bridge', name: 'Bodyweight Glute Bridge', equipment: ['bodyweight'] },
      ]
    }
  ],
  'Upper': [
    {
      id: 'chest-press',
      name: 'Chest Press',
      variations: [
        { id: 'dumbbell-chest-press', name: 'Dumbbell Chest Press', equipment: ['dumbbells'] },
        { id: 'barbell-bench-press', name: 'Barbell Bench Press', equipment: ['barbell'] },
        { id: 'machine-chest-press', name: 'Machine Chest Press', equipment: ['machines'] },
      ]
    },
    {
      id: 'lat-pulldown',
      name: 'Lat Pulldown',
      variations: [
        { id: 'lat-pulldown-machine', name: 'Lat Pulldown', equipment: ['machines'] },
        { id: 'pull-ups', name: 'Pull-ups', equipment: ['bodyweight'] },
      ]
    },
    {
      id: 'shoulder-press',
      name: 'Shoulder Press',
      variations: [
        { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', equipment: ['dumbbells'] },
        { id: 'barbell-overhead-press', name: 'Barbell Overhead Press', equipment: ['barbell'] },
        { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', equipment: ['machines'] },
      ]
    },
    {
      id: 'row',
      name: 'Row',
      variations: [
        { id: 'dumbbell-row', name: 'Dumbbell Row', equipment: ['dumbbells'] },
        { id: 'barbell-row', name: 'Barbell Row', equipment: ['barbell'] },
        { id: 'cable-row', name: 'Cable Row', equipment: ['machines'] },
      ]
    },
    {
      id: 'bicep-curl',
      name: 'Bicep Curl',
      variations: [
        { id: 'dumbbell-curl', name: 'Dumbbell Curl', equipment: ['dumbbells'] },
        { id: 'barbell-curl', name: 'Barbell Curl', equipment: ['barbell'] },
        { id: 'cable-curl', name: 'Cable Curl', equipment: ['machines'] },
      ]
    },
    {
      id: 'tricep-pushdown',
      name: 'Tricep Pushdown',
      variations: [
        { id: 'cable-tricep-pushdown', name: 'Cable Tricep Pushdown', equipment: ['machines'] },
        { id: 'dumbbell-overhead-tricep', name: 'Dumbbell Overhead Tricep', equipment: ['dumbbells'] },
      ]
    }
  ],
  'Cardio/Core': [
    {
      id: 'cardio',
      name: 'Cardio',
      variations: [
        { id: 'treadmill', name: '20-30 min Cardio (Treadmill)', equipment: ['machines'] },
        { id: 'outdoor-run', name: '20-30 min Cardio (Run)', equipment: ['bodyweight'] },
      ]
    },
    {
      id: 'plank',
      name: 'Plank',
      variations: [
        { id: 'plank-bw', name: 'Plank', equipment: ['bodyweight'] },
      ]
    },
    {
      id: 'abs',
      name: 'Abs',
      variations: [
        { id: 'crunches', name: 'Crunches', equipment: ['bodyweight'] },
        { id: 'dead-bugs', name: 'Dead Bugs', equipment: ['bodyweight'] },
      ]
    }
  ]
};
