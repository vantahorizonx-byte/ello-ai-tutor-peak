import type { GradeResult, Quiz, QuizQuestion } from '../types';

/* ------------------------------ offline chat ----------------------------- */

/**

 * A small, deterministic study tutor for when the Gemini backend is not
 * reachable. It answers the topics the starter board covers and otherwise
 * nudges the student to explain their own thinking — never a fake "AI" answer
 * pretending to be the model.
 */

const RULES: { test: RegExp; answer: string }[] = [
  {
    test: /newton|first law|inertia/i,
    answer:
      'Newton’s first law: an object keeps doing what it is doing unless a net force acts on it. ' +
      'That “stubbornness” is inertia, and it grows with mass. Try it: a book on a table stays put because ' +
      'weight and the table’s normal force cancel out.',
  },
  {
    test: /second law|f\s*=\s*m|acceleration|net force/i,
    answer:
      'Newton’s second law is F = m · a. Add every force as a vector to get the net force, then divide by mass. ' +
      'Twice the net force gives twice the acceleration; twice the mass gives half the acceleration for the same push.',
  },
  {
    test: /third law|reaction/i,
    answer:
      'Newton’s third law: forces come in pairs, equal in size and opposite in direction, acting on different objects. ' +
      'You push the wall, the wall pushes you back — that is why you roll away on a skateboard.',
  },
  {
    test: /friction|rough|μ|mu\b/i,
    answer:
      'Friction is f = μ · N. It always opposes relative sliding (or the attempt to slide). ' +
      'Static friction can grow up to μₛN; kinetic friction stays roughly at μₖN once motion starts.',
  },
  {
    test: /weight|gravity|g\b/i,
    answer: 'Weight is the force of gravity: W = m · g, with g ≈ 9.8 m/s² on Earth. Mass stays the same everywhere; weight changes with g.',
  },
  {
    test: /normal|surface/i,
    answer: 'The normal force is the surface pushing back perpendicular to the contact. On a flat floor it equals mg; on a slope it is mg·cos θ.',
  },
  {
    test: /momentum|impulse/i,
    answer:
      'Momentum p = m · v. Impulse changes momentum: F · Δt = Δp. That is why a longer stopping time (airbag, bent knees) means a smaller force.',
  },
  {
    test: /energy|work|kinetic|potential/i,
    answer:
      'Work is W = F · d · cos θ, kinetic energy is ½mv², and gravitational potential energy is mgh. ' +
      'With no friction, mechanical energy is conserved — track it before and after.',
  },
];

const FALLBACK = [
  'Break the question into what you know, what you want, and which law connects them. Tell me the numbers and I’ll walk the algebra with you.',
  'Good question. Start with a free-body diagram — every force as an arrow — then apply F = m · a in each direction.',
  'Say it back in one sentence: what is changing, and what force causes that change? If you can name both, the equation usually appears.',
];

let fallbackIndex = 0;

export function localTutorReply(question: string): string {
  const match = RULES.find((rule) => rule.test.test(question));
  if (match) return match.answer;
  const reply = FALLBACK[fallbackIndex % FALLBACK.length];
  fallbackIndex += 1;
  return reply;
}

/* ------------------------------- local quiz ------------------------------ */

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    prompt: 'A block slides at constant velocity across a rough floor. What is the net force on it?',
    options: ['Zero', 'Equal to friction', 'Equal to its weight', 'Equal to the normal force'],
  },
  {
    id: 'q2',
    type: 'mcq',
    prompt: 'You double the net force on a cart while keeping its mass the same. Its acceleration…',
    options: ['stays the same', 'doubles', 'halves', 'quadruples'],
  },
  {
    id: 'q3',
    type: 'mcq',
    prompt: 'Which pair of forces is a Newton’s-third-law pair?',
    options: [
      'Weight of a book and the normal force on it',
      'Friction and applied force on a sliding box',
      'Earth pulling you down and you pulling Earth up',
      'Tension and weight on a hanging lamp',
    ],
  },
  {
    id: 'q4',
    type: 'mcq',
    prompt: 'On a frictionless slope of angle θ, the component of weight along the slope is…',
    options: ['mg', 'mg·sin θ', 'mg·cos θ', 'mg·tan θ'],
  },
  {
    id: 'q5',
    type: 'mcq',
    prompt: 'The SI unit of force is the…',
    options: ['joule', 'newton', 'pascal', 'watt'],
  },
  {
    id: 'q6',
    type: 'mcq',
    prompt: 'Kinetic friction on a sliding box always points…',
    options: [
      'in the direction of motion',
      'opposite to the relative sliding',
      'straight down',
      'along the normal force',
    ],
  },
  {
    id: 'q7',
    type: 'mcq',
    prompt: 'You take a 2 kg book to the Moon (g ≈ 1.6 m/s²). What changes?',
    options: ['Only its mass', 'Only its weight', 'Both mass and weight', 'Neither changes'],
  },
  {
    id: 'q8',
    type: 'mcq',
    prompt: 'An object’s inertia depends on its…',
    options: ['speed', 'mass', 'weight', 'shape'],
  },
  {
    id: 'q9',
    type: 'mcq',
    prompt: 'The SI unit of momentum is…',
    options: ['N·m', 'kg·m/s', 'kg·m/s²', 'J/s'],
  },
  {
    id: 'q10',
    type: 'mcq',
    prompt: 'A force acts perpendicular to an object’s displacement. The work done is…',
    options: ['maximum', 'equal to the force', 'zero', 'negative'],
  },
];

const CORRECT: Record<string, number> = {
  q1: 0,
  q2: 1,
  q3: 2,
  q4: 1,
  q5: 1,
  q6: 1,
  q7: 1,
  q8: 1,
  q9: 1,
  q10: 2,
};

/** Short labels used by the results view. */
export const QUIZ_TOPICS: Record<string, string> = {
  q1: 'Net force at constant velocity',
  q2: 'Force and acceleration',
  q3: 'Third-law pairs',
  q4: 'Weight on a slope',
  q5: 'Unit of force',
  q6: 'Direction of friction',
  q7: 'Mass vs weight',
  q8: 'What inertia depends on',
  q9: 'Unit of momentum',
  q10: 'Work at 90°',
};

const EXPLANATIONS: Record<string, string> = {
  q1: 'Constant velocity means zero acceleration, so the forces balance: applied force equals friction and the net force is zero.',
  q2: 'F = m · a with m fixed means acceleration is proportional to net force — double F, double a.',
  q3: 'Third-law pairs act on different bodies: Earth pulls you, you pull Earth. Weight and normal force both act on the book, so they are not a pair.',
  q4: 'The along-slope component is mg·sin θ; the perpendicular component (which sets the normal force) is mg·cos θ.',
  q5: 'One newton is the force that gives 1 kg an acceleration of 1 m/s². Joule is energy, pascal is pressure, watt is power.',
  q6: 'Friction opposes the relative sliding between surfaces, so it points against the motion (or the attempted motion).',
  q7: 'Mass is the amount of matter and stays 2 kg. Weight is m·g, so it drops from about 19.6 N to about 3.2 N.',
  q8: 'Inertia is resistance to a change in motion and depends only on mass — not on speed or weight.',
  q9: 'Momentum p = m·v, so the unit is kg·m/s (equivalently N·s). N·m is a joule.',
  q10: 'W = F·d·cos θ. At θ = 90°, cos θ = 0, so a perpendicular force does no work.',
};

export const localQuiz = (): Quiz => ({
  questions: QUESTIONS.map((question) => ({ ...question })),
  generatedAt: new Date().toISOString(),
});

export function gradeLocalQuiz(
  answers: { questionId: string; value: string | number }[],
): GradeResult {
  const results = QUESTIONS.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    const chosen = Number(answer?.value ?? -1);
    const correctIndex = CORRECT[question.id] ?? 0;
    return {
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      yourAnswer: question.options?.[chosen] ?? 'No answer',
      correctAnswer: question.options?.[correctIndex] ?? '',
      correct: chosen === correctIndex,
      explanation: EXPLANATIONS[question.id] ?? '',
      options: question.options,
    };
  });

  const score = results.filter((result) => result.correct).length;
  const total = results.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const verdict =
    percent >= 90
      ? 'Exam ready — that is a top-band paper.'
      : percent >= 70
        ? 'Solid work. Tighten the slips and this is a 90.'
        : percent >= 40
          ? 'Halfway there — revisit the recap, then retake.'
          : 'Start with the force diagram, then work through the recap before retaking.';

  return { score, total, percent, verdict, results, gradedAt: new Date().toISOString() };
}
