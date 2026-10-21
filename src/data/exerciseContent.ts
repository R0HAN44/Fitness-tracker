/**
 * Exercise content engine — provides step-by-step setup and execution instructions,
 * form cues, common mistakes, and compound vs. isolation classifications for exercises.
 */

export interface ExerciseContentData {
  movementType: 'compound' | 'isolation';
  instructions: string[];
  commonMistakes: string[];
}

/**
 * Handcrafted high-detail instructions and form cues for primary lifts.
 */
const HANDCRAFTED_CONTENT: Record<string, ExerciseContentData> = {
  'barbell-flat-bench-press': {
    movementType: 'compound',
    instructions: [
      'Lie flat on the bench with your eyes aligned directly under the barbell. Plant your feet flat and firmly into the floor.',
      'Grip the bar slightly wider than shoulder-width with wrists straight. Retract your shoulder blades and squeeze them down into the bench.',
      'Unrack the barbell and establish full stability directly over your chest with locked elbows.',
      'Inhale deeply, brace your core, and lower the bar under control to your lower-to-mid sternum, keeping elbows angled at 45 to 70 degrees.',
      'Touch your chest gently with zero bounce, then drive the bar upward forcefully while pressing your feet into the floor.',
      'Lock out at the top over your chest without unlocking or shifting your shoulder blades.',
    ],
    commonMistakes: [
      'Flaring elbows out perpendicular to the torso (90 degrees), placing high shearing stress on the shoulder joint.',
      'Bouncing the barbell off the chest rather than controlling the eccentric descent.',
      'Lifting your hips or buttocks off the bench to assist the press.',
      'Letting the wrists bend backwards instead of stacking the barbell directly over the forearm bones.',
    ],
  },
  'barbell-incline-bench-press': {
    movementType: 'compound',
    instructions: [
      'Set an incline bench between 30 and 45 degrees. Lie back and plant your feet firmly on the ground.',
      'Grip the bar slightly outside shoulder-width. Retract your scapulae and keep your upper back tight against the pad.',
      'Unrack the bar and hold it straight above your upper chest.',
      'Lower the barbell slowly toward your clavicle / upper chest while tucking your elbows slightly.',
      'Press the bar straight up until arms are fully extended, engaging your upper pecs and anterior delts.',
    ],
    commonMistakes: [
      'Setting the bench angle too steep (>45 degrees), which shifts tension primarily onto the front deltoids instead of the upper chest.',
      'Bouncing the bar off the upper chest.',
      'Arching excessively so the movement mimics a flat bench press.',
    ],
  },
  'barbell-overhead-press': {
    movementType: 'compound',
    instructions: [
      'Stand with feet shoulder-width apart, holding the barbell at collarbone height with a full grip just outside your shoulders.',
      'Squeeze your glutes, brace your core, and pull your head slightly backward to clear the bar path.',
      'Press the barbell straight upward in a vertical line, extending your elbows fully overhead.',
      'As the bar passes your forehead, bring your head forward under the bar into a neutral lockout.',
      'Lower the barbell under control back to the collarbones before starting the next rep.',
    ],
    commonMistakes: [
      'Arching the lower back excessively instead of bracing the glutes and core.',
      'Pressing the barbell outward around the head in a curved loop rather than a straight vertical line.',
      'Flaring elbows outward early in the press.',
    ],
  },
  'barbell-back-squat': {
    movementType: 'compound',
    instructions: [
      'Step under the bar, placing it securely on your upper traps (high bar) or across the rear delts (low bar).',
      'Step back with 2 to 3 deliberate steps. Set your feet just outside shoulder-width with toes angled outward 15 to 30 degrees.',
      'Take a deep belly breath and brace your core 360 degrees as if preparing for a punch.',
      'Initiate the squat by breaking simultaneously at the hips and knees, sitting down between your thighs while keeping your chest proud.',
      'Descend until the hip crease dips below the top of the knee (parallel or deeper).',
      'Drive powerfully out of the hole by pressing through your whole foot, keeping knees tracking inline with your toes.',
    ],
    commonMistakes: [
      'Knees caving inward (valgus collapse) during the ascent.',
      'Rising onto the balls of the feet or letting the heels lift off the ground.',
      'Collapsing the chest forward and turning the movement into a good morning.',
      'Cutting depth high above parallel before reaching full muscular engagement.',
    ],
  },
  'barbell-front-squat': {
    movementType: 'compound',
    instructions: [
      'Rest the bar across your front deltoids and clavicles with your elbows driven high and parallel to the floor.',
      'Stand tall with feet shoulder-width apart, toes flared slightly out.',
      'Maintain an upright torso and deep core brace as you descend between your hips.',
      'Keep your elbows driving upward throughout the entire descent and ascent to prevent the bar from rolling forward.',
      'Drive through your midfoot to stand back up to a full lockout.',
    ],
    commonMistakes: [
      'Letting the elbows drop, which causes the barbell to roll down the arms.',
      'Rounding the thoracic spine under the weight.',
    ],
  },
  'barbell-deadlift': {
    movementType: 'compound',
    instructions: [
      'Stand with feet hip-width apart and the barbell cutting directly across your midfoot (about 1 inch from your shins).',
      'Hinge at the hips and grip the bar just outside your legs without moving the bar.',
      'Pull your shins forward until they make contact with the bar. Do not roll the bar.',
      'Engage your lats by squeezing your armpits tight, pulling the slack out of the bar until it clicks.',
      'Drive the floor away with your legs, keeping the bar touching your shins and thighs throughout the pull.',
      'Lock out with hips and knees extended simultaneously, standing tall without hyperextending your lumbar spine.',
    ],
    commonMistakes: [
      'Rounding the lower back during the initial pull from the floor.',
      'Allowing the barbell to drift away from the body during the ascent.',
      'Jerking the bar off the floor before setting tension and pulling out the slack.',
      'Hyperextending the lower back at the top lockout.',
    ],
  },
  'barbell-romanian-deadlift': {
    movementType: 'compound',
    instructions: [
      'Stand tall holding a barbell at hip level with an overhand grip and knees soft (slightly bent, but locked in place).',
      'Keep shoulder blades packed and core tight throughout.',
      'Push your hips backward as if trying to touch the wall behind you, sliding the barbell down your thighs.',
      'Lower the barbell until you feel a deep stretch in your hamstrings (typically right below the knees or mid-shin).',
      'Drive your hips forward and squeeze your glutes at the top to return to the starting position.',
    ],
    commonMistakes: [
      'Bending the knees into a squat rather than maintaining a pure hip hinge.',
      'Allowing the lower back to round when reaching for more depth.',
      'Letting the bar drift away from the legs instead of skimming the thighs.',
    ],
  },
  'barbell-bent-over-row': {
    movementType: 'compound',
    instructions: [
      'Hinge at the hips with a flat back at roughly 45 to 60 degrees. Grip the barbell with hands just outside your knees.',
      'Keep your chest up, neck neutral, and core braced tight.',
      'Pull the barbell upward toward your lower ribcage / belly button by driving your elbows backward and squeezing your shoulder blades together.',
      'Hold the contraction for a fraction of a second, then lower the bar with full control until arms are extended.',
    ],
    commonMistakes: [
      'Using aggressive torso momentum and jerking upward to heave the weight.',
      'Rounding the lumbar spine.',
      'Pulling with the biceps rather than driving the elbows backward.',
    ],
  },
  'cable-lat-pulldown': {
    movementType: 'compound',
    instructions: [
      'Sit facing the lat pulldown machine and secure your thighs firmly under the pads.',
      'Grip the bar with hands wider than shoulder-width using an overhand grip.',
      'Lean back slightly (about 10 to 15 degrees) and draw your shoulder blades down and back.',
      'Pull the bar down toward your upper chest by driving your elbows down and in toward your ribs.',
      'Squeeze your lats at the bottom, then slowly resist the bar as it travels back up to a full stretch overhead.',
    ],
    commonMistakes: [
      'Swinging your upper body backward to use momentum.',
      'Pulling the bar behind the neck, which puts the rotator cuff in a compromised position.',
      'Failing to achieve a full stretch at the top of each repetition.',
    ],
  },
  'pull-up': {
    movementType: 'compound',
    instructions: [
      'Hang from a pull-up bar with an overhand grip slightly wider than shoulder-width, starting from a full dead hang.',
      'Engage your lats by pulling your shoulder blades downward into an active hang.',
      'Pull your chest toward the bar by driving your elbows down toward your hips.',
      'Continue pulling until your chin completely clears the bar.',
      'Lower yourself with control back to a complete dead hang before initiating the next repetition.',
    ],
    commonMistakes: [
      'Kipping or swinging the legs to generate momentum.',
      'Cutting the range of motion short at the top or bottom.',
      'Shrugging the shoulders up toward the ears during the pull.',
    ],
  },
  'bodyweight-tricep-dip': {
    movementType: 'compound',
    instructions: [
      'Mount the parallel bars with arms extended and locked out. Keep your shoulders depressed away from your ears.',
      'Lean slightly forward to engage the chest and triceps equally, crossing your ankles if preferred.',
      'Lower your body by bending at the elbows until your upper arms are at least parallel to the floor (approx 90 degree elbow bend).',
      'Press through the heels of your palms to extend your arms back to the top lockout.',
    ],
    commonMistakes: [
      'Descending too deep if shoulder mobility is restricted, risking anterior capsule strain.',
      'Flaring elbows excessively outward instead of keeping them tracking back.',
    ],
  },
  'barbell-curl': {
    movementType: 'isolation',
    instructions: [
      'Stand tall holding a barbell with a shoulder-width underhand grip. Pin your elbows directly beside your torso.',
      'Keep your core tight and upper body still with no backward swinging.',
      'Curl the barbell upward by flexing your biceps until the bar reaches shoulder height.',
      'Squeeze the biceps at peak contraction, then lower the bar under full control over 2 to 3 seconds until arms are straight.',
    ],
    commonMistakes: [
      'Swinging the torso backward and using hip momentum to initiate the curl.',
      'Allowing the elbows to drift far forward, taking tension off the biceps.',
      'Dropping the barbell quickly on the eccentric lowering phase.',
    ],
  },
  'cable-face-pull': {
    movementType: 'compound',
    instructions: [
      'Attach a rope to a cable pulley set at eye level. Grasp the ends of the rope with thumbs pointing backward.',
      'Step back to create tension, setting your stance in an athletic position.',
      'Pull the center of the rope toward your face while separating your hands and rotating your wrists upward.',
      'End with elbows high and hands beside your ears (a "double bicep" pose) squeezing your rear delts and mid-traps.',
      'Return smoothly under control to the start position.',
    ],
    commonMistakes: [
      'Setting the pulley too low and pulling toward the neck instead of the eyes/forehead.',
      'Using too much weight and leaning backward with body momentum.',
      'Failing to externally rotate the shoulders at the end of the pull.',
    ],
  },
  'cable-lateral-raise': {
    movementType: 'isolation',
    instructions: [
      'Set the cable pulley to its lowest setting. Grasp the single handle with the far arm across your body or set behind you.',
      'Stand with a tall posture and slight forward lean.',
      'Raise your arm upward and outward in the scapular plane (approx 30 degrees forward of your side) until hand reaches shoulder level.',
      'Pause briefly at the top to contract the lateral delt, then lower slowly resisting the cable tension.',
    ],
    commonMistakes: [
      'Shrugging the trap upward to heave the weight up.',
      'Raising the hand higher than the elbow, which shifts load to the anterior delt.',
    ],
  },
};

/**
 * Determine if an exercise is predominantly compound or isolation.
 */
export function determineMovementType(
  slug: string,
  name: string,
  primaryMuscle: string,
  exerciseType: string,
): 'compound' | 'isolation' {
  if (HANDCRAFTED_CONTENT[slug]?.movementType) {
    return HANDCRAFTED_CONTENT[slug].movementType;
  }

  const lowerName = name.toLowerCase();
  const lowerSlug = slug.toLowerCase();

  // Known isolation cues
  const isolationTerms = [
    'curl',
    'extension',
    'fly',
    'lateral raise',
    'front raise',
    'rear delt',
    'kickback',
    'calf raise',
    'wrist',
    'shrug',
    'pec deck',
    'crunch',
    'sit-up',
    'ab wheel',
    'pullover',
  ];

  for (const term of isolationTerms) {
    if (lowerName.includes(term) || lowerSlug.includes(term)) {
      return 'isolation';
    }
  }

  // Known compound cues
  const compoundTerms = [
    'press',
    'squat',
    'deadlift',
    'row',
    'pull-up',
    'pullup',
    'chin-up',
    'chinup',
    'pulldown',
    'dip',
    'lunge',
    'clean',
    'snatch',
    'thrust',
    'push-up',
    'pushup',
  ];

  for (const term of compoundTerms) {
    if (lowerName.includes(term) || lowerSlug.includes(term)) {
      return 'compound';
    }
  }

  // Fallback by primary muscle
  if (['biceps', 'triceps', 'calves', 'forearms', 'abs'].includes(primaryMuscle)) {
    return 'isolation';
  }

  return 'compound';
}

/**
 * Generate structured, step-by-step instructions for an exercise.
 */
export function getExerciseInstructions(
  slug: string,
  name: string,
  primaryMuscle: string,
  equipment: string,
  exerciseType: string,
): string[] {
  if (HANDCRAFTED_CONTENT[slug]?.instructions) {
    return HANDCRAFTED_CONTENT[slug].instructions;
  }

  const steps: string[] = [];
  const lowerName = name.toLowerCase();

  // Step 1: Setup
  if (equipment === 'barbell') {
    steps.push(`Position the barbell with appropriate weight plates securely locked with collars.`);
  } else if (equipment === 'dumbbell') {
    steps.push(`Select a pair of dumbbells that allows strict form. Assume a stable, athletic posture.`);
  } else if (equipment === 'cable') {
    steps.push(`Adjust the cable pulley height and attach the appropriate handle. Step out to create initial tension.`);
  } else if (equipment === 'machine') {
    steps.push(`Adjust the seat height and pads on the machine so the axis of rotation aligns with your target joint.`);
  } else {
    steps.push(`Set up in a balanced, grounded position with your core engaged.`);
  }

  // Step 2: Starting Position
  steps.push(
    `Set your shoulder blades back and down, brace your core, and establish a firm, controlled grip.`,
  );

  // Step 3: Execution / Concentric phase
  if (lowerName.includes('press') || lowerName.includes('push')) {
    steps.push(`Press the resistance smoothly until your arms are extended, driving through your chest and shoulders without locking out abruptly.`);
  } else if (lowerName.includes('pull') || lowerName.includes('row')) {
    steps.push(`Pull the resistance toward your torso by driving your elbows back and squeezing your ${primaryMuscle} at peak contraction.`);
  } else if (lowerName.includes('squat') || lowerName.includes('leg press')) {
    steps.push(`Descend smoothly by hinging at the hips and bending your knees until your thighs are at least parallel to the platform, then drive through your midfoot.`);
  } else if (lowerName.includes('curl')) {
    steps.push(`Curl the weight upward toward your shoulders while keeping your elbows stationary against your sides.`);
  } else if (lowerName.includes('extension')) {
    steps.push(`Extend your arms fully to contract your triceps, keeping your upper arms stationary throughout.`);
  } else if (lowerName.includes('raise')) {
    steps.push(`Raise the weight outward until your arms reach shoulder level, leading slightly with your elbows.`);
  } else {
    steps.push(`Execute the movement with controlled tempo, focusing on a deep contraction of the ${primaryMuscle}.`);
  }

  // Step 4: Eccentric phase / Return
  steps.push(
    `Lower the weight under complete control over 2 to 3 seconds back to the starting stretch before commencing the next rep.`,
  );

  return steps;
}

/**
 * Generate practical common mistakes and form cues for an exercise.
 */
export function getExerciseCommonMistakes(
  slug: string,
  name: string,
  primaryMuscle: string,
  equipment: string,
): string[] {
  if (HANDCRAFTED_CONTENT[slug]?.commonMistakes) {
    return HANDCRAFTED_CONTENT[slug].commonMistakes;
  }

  const mistakes: string[] = [];
  const lowerName = name.toLowerCase();

  // General momentum mistake
  mistakes.push(`Using excessive torso swinging or momentum instead of making the target muscle do the work.`);

  // Range of motion mistake
  mistakes.push(`Shortcutting the range of motion by skipping either the full lockout or the deep eccentric stretch.`);

  // Specific biomechanical mistakes
  if (lowerName.includes('press') || lowerName.includes('bench')) {
    mistakes.push(`Flaring the elbows out too wide at 90 degrees, which increases strain on the shoulder rotator cuff.`);
    mistakes.push(`Bouncing the weight at the bottom of the movement.`);
  } else if (lowerName.includes('squat') || lowerName.includes('lunge')) {
    mistakes.push(`Allowing the knees to cave inward during the drive upward.`);
    mistakes.push(`Shifting weight forward onto the toes and allowing the heels to leave the floor.`);
  } else if (lowerName.includes('deadlift') || lowerName.includes('row')) {
    mistakes.push(`Rounding the lumbar spine under load instead of maintaining a neutral, braced core.`);
    mistakes.push(`Letting the weight drift away from the center of gravity.`);
  } else if (lowerName.includes('curl') || lowerName.includes('extension')) {
    mistakes.push(`Letting the elbows drift forward and backward, turning an isolated movement into a compound heave.`);
  } else if (lowerName.includes('raise')) {
    mistakes.push(`Shrugging the upper traps up toward the ears instead of isolating the shoulder deltoid.`);
  }

  return mistakes;
}
