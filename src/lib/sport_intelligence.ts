export type PhysiologicalDemand = 'Explosive Power' | 'Aerobic Endurance' | 'Anaerobic Capacity' | 'Agility' | 'Reaction Time' | 'Strength' | 'Skill Precision' | 'Mental Focus' | 'Fatigue Resistance';

export interface DemandDetail {
  name: string;
  description: string;
}

export const DEMAND_MAP: Record<PhysiologicalDemand, DemandDetail> = {
  'Explosive Power': { name: 'Explosive Power', description: 'Your ability to move with maximum speed and force (sprints, jumps).' },
  'Aerobic Endurance': { name: 'Stamina (Aerobic)', description: 'Your capacity to keep going at a steady pace for a long time.' },
  'Anaerobic Capacity': { name: 'Short-Burst Energy', description: 'Your power for intense, short efforts (30-90 seconds).' },
  'Agility': { name: 'Agility', description: 'How quickly you can change direction while staying balanced.' },
  'Reaction Time': { name: 'Reaction Speed', description: 'How fast you respond to what’s happening in the game.' },
  'Strength': { name: 'Strength', description: 'Your maximum power against resistance (grappling, lifting).' },
  'Skill Precision': { name: 'Skill Accuracy', description: 'Focus and accuracy when the pressure is on.' },
  'Mental Focus': { name: 'Mental Focus', description: 'Ability to stay sharp and make clear decisions.' },
  'Fatigue Resistance': { name: 'Fatigue Resistance', description: 'Your ability to maintain performance as tiredness sets in.' }
};

export interface SportPosition {
  name: string;
  specificDemands: PhysiologicalDemand[];
  highRiskRegions: string[];
  weights: Record<string, number>; // Hidden weights: total 100
  drills?: {
    fatigued: string[];
    primed: string[];
    recovering: string[];
  };
}

export interface SportData {
  id: string;
  name: string;
  topDemands: PhysiologicalDemand[];
  highRiskRegions: string[];
  positions: SportPosition[];
  microQuestion: string; // Used in daily log
  dashboardFocus: string; // Context for the intelligence engine
  precisionTemplates: {
    fatigued: { what: string; how: string; why: string };
    primed: { what: string; how: string; why: string };
    recovering: { what: string; how: string; why: string };
    painful?: Record<string, { what: string; how: string; why: string }>;
  };
  competitionProtocol?: {
    pre: string[];
    focus: string;
    nutrition: string;
  };
  recoveryProtocol?: {
    priority: string;
    targets: string[];
  };
}

export const SPORTS_DATABASE: Record<string, SportData> = {
  cricket: {
    id: 'cricket',
    name: 'Cricket',
    topDemands: ['Skill Precision', 'Mental Focus', 'Explosive Power'],
    highRiskRegions: ['Shoulder', 'Lower Back', 'Hamstring'],
    microQuestion: "How does your bowling/batting arm feel specifically?",
    dashboardFocus: "skill & structural readiness",
    precisionTemplates: {
      fatigued: { 
        what: "Start slow with your first 6–8 balls before bowling at full speed.", 
        how: "Keep your effort at about 70-80% for the first 15 minutes.", 
        why: "Your back feels a bit stiff today, so don't rush into full pace." 
      },
      primed: { 
        what: "Great day for full-speed bowling and intense practice.", 
        how: "Start your high-speed drills early in the session.", 
        why: "Your body is fresh and ready for maximum effort today." 
      },
      recovering: { 
        what: "Focus on your rhythm and technique rather than speed.", 
        how: "Bowl half of your usual balls but with 100% focus on where they land.", 
        why: "You're recovering well, but we should manage how much you bowl today." 
      }
    },
    competitionProtocol: {
      pre: ["Eat carb-rich meal 3 hrs before match", "Hydrate 500ml 90 mins before toss", "Dynamic mobility 45 mins before play"],
      focus: "Technical rhythm & line/length consistency",
      nutrition: "Maintain electrolyte balance; small snacks during intervals"
    },
    recoveryProtocol: {
      priority: "Structural Integrity",
      targets: ["Lower back mobility", "Active recovery swimming", "Shoulder icing if soreness > 4"]
    },
    positions: [
      { 
        name: 'Fast Bowler', 
        specificDemands: ['Explosive Power', 'Mental Focus'], 
        highRiskRegions: ['Lower Back', 'Ankle'],
        weights: { pace: 30, structural: 30, lumbar: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Target Bowling: 18 yds, 50% effort, focus on seam release", "Wall Drills: 3 sets of 8 delivery stride walk-throughs"],
          primed: ["Match Simulation: 4 overs at 100% intensity hitting specific lengths", "Weighted Ball Bowling: 2x6 overs at 90% effort for arm speed"],
          recovering: ["Spot Bowling: Full length, 70% effort, 3 overs", "Static Core Holds: 3x45s planks to brace lumbar spine"]
        }
      },
      { 
        name: 'Spin Bowler', 
        specificDemands: ['Skill Precision', 'Mental Focus'], 
        highRiskRegions: ['Shoulder', 'Lower Back'],
        weights: { spin: 30, fingers: 30, shoulder: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Static Release Drills: 50 reps focusing purely on revs without a run-up", "Target Bowling: 2 overs, slow flight to groove action"],
          primed: ["Variation Practice: 4 overs at 100% effort mixing stock ball with variations", "Match Simulation: Set 7-4 field and bowl to a designated plan"],
          recovering: ["Arm Speed Focus: 3 overs at 80% pace focusing strictly on rotation", "Shoulder Mobility: 10 mins band work before and after session"]
        }
      },
      { 
        name: 'Batsman', 
        specificDemands: ['Reaction Time', 'Skill Precision', 'Agility'], 
        highRiskRegions: ['Hamstring', 'Shoulder'],
        weights: { reaction: 40, agility: 20, hamstring: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Drop Ball Drills: 50 reps focusing solely on head position and balance", "Shadow Batting: 5 mins focusing on stride alignment"],
          primed: ["High-Velocity Throwdowns: 15 mins vs 140kmh+ pace simulation", "Boundary Scenarios: 3 overs vs spinners focusing on clearing the infield"],
          recovering: ["Underarm Feed Drills: 40 reps focusing on sweet-spot contact", "Throwdowns: 10 mins at 70% intensity targeting gaps"]
        }
      },
      { 
        name: 'Wicketkeeper', 
        specificDemands: ['Agility', 'Reaction Time'], 
        highRiskRegions: ['Knee', 'Upper Back'],
        weights: { agility: 30, reaction: 30, knee: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Stance Holds: 5x30s low squat position focusing on balance and weight distribution", "Soft Hands: 50 reps catching underarm throws emphasizing drawing the ball in"],
          primed: ["Reaction Board: 15 mins catching deflected throws at high velocity", "Diving Drills: 20 reps full extension dives to the left and right catching tennis balls"],
          recovering: ["Footwork Only: 5 mins mirroring a batsman's movement without the ball", "Standing Up: 50 catches off a spinner focusing solely on timing the gather"]
        }
      },
      { 
        name: 'All-Rounder', 
        specificDemands: ['Aerobic Endurance', 'Explosive Power', 'Skill Precision'], 
        highRiskRegions: ['Lower Back', 'Shoulder', 'Hamstring'],
        weights: { stamina: 25, power: 25, recovery: 20, sleep: 15, soreness: 15 },
        drills: {
          fatigued: ["Mixed Technical: 3 overs at 60% effort + 20 mins drop-ball batting", "Core Brace: 4x1min planks to stabilize spine between roles"],
          primed: ["Match Simulation: 4 overs at 100% + 15 mins high-intensity throwdowns", "Explosive Intervals: 6x20m sprints + 12 ball bowling burst"],
          recovering: ["Skill Isolation: 4 overs focusing on line/length + 15 mins sweet-spot batting", "Dynamic Mobility: 15 mins focused on shoulder and lower back flow"]
        }
      }
    ]
  },
  football: {
    id: 'football',
    name: 'Football',
    topDemands: ['Aerobic Endurance', 'Agility', 'Explosive Power'],
    highRiskRegions: ['Knee', 'Ankle', 'Hamstring'],
    microQuestion: "Any heaviness specifically in your calves or quads?",
    dashboardFocus: "explosive sharpness",
    precisionTemplates: {
      fatigued: { 
        what: "Avoid full sprints for your first few efforts.", 
        how: "Keep your effort around 80% until your legs feel loose and ready.", 
        why: "Your legs feel heavy today, which could lead to a strain if you push too early." 
      },
      primed: { 
        what: "Perfect day for high-speed turns and sprints.", 
        how: "Get into your 100% effort sprints early in the session.", 
        why: "Your energy is high and your muscles are fresh. Go for it!" 
      },
      recovering: { 
        what: "Focus on your position and moving the ball well.", 
        how: "Don't push your top speed; focus on where you are on the pitch.", 
        why: "You're still recovering, so avoid pushing your heart rate too high today." 
      }
    },
    competitionProtocol: {
      pre: ["High carb meal 3.5 hrs before kickoff", "Hydrate 600ml 2 hrs before", "Explosive neural warmup 20 mins before"],
      focus: "Explosive first step & spatial awareness",
      nutrition: "Simple sugars at halftime; immediate protein post-match"
    },
    recoveryProtocol: {
      priority: "CNS & Muscle Repair",
      targets: ["Light aerobic flush (20 mins)", "Contrast water therapy", "Protein target: 1.6g/kg"]
    },
    positions: [
      { 
        name: 'Midfielder', 
        specificDemands: ['Aerobic Endurance'], 
        highRiskRegions: ['Ankle'],
        weights: { endurance: 30, repeatedSprint: 30, ankle: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Stationary Passing: 50 reps 2-touch passing against a wall", "Spatial Scanning: 5 mins 360-degree head movement drills without the ball"],
          primed: ["Repeated Sprint Ability (RSA): 6x40m shuttles with 20s recovery", "Box-to-Box Simulation: 4x3min high-intensity small sided games"],
          recovering: ["Jockeying Drills: 10 mins shadow defending at 60% intensity", "Aerobic Build: 20 mins light jogging focusing on nasal breathing"]
        }
      },
      { 
        name: 'Forward', 
        specificDemands: ['Explosive Power', 'Agility'], 
        highRiskRegions: ['Knee', 'Hamstring'],
        weights: { sharpness: 35, hamstring: 25, knee: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Static Finishing: 30 strikes on goal from edge of box without a sprint lead-up", "First Touch Control: 50 reps receiving aerial balls"],
          primed: ["Cut-off Sprints: 5x20m maximal effort sprints with immediate deceleration", "1v1 Isolation: 10 mins attacking defender at full pace"],
          recovering: ["Target Practice: 20 relaxed strikes emphasizing technique over power", "Agility Ladder: 5 mins coordination work at 50% speed"]
        }
      },
      { 
        name: 'Defender', 
        specificDemands: ['Strength', 'Agility'], 
        highRiskRegions: ['Lower Back'],
        weights: { strength: 30, structural: 30, back: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Defensive Heading: 20 reps stationary aerial clearance", "Stance Work: 3x1min low defensive posture holds"],
          primed: ["Maximal Change of Direction: 6x10m 180-degree turn sprints", "Physical Duel Simulation: 10 mins 1v1 shielding drills"],
          recovering: ["Shadow Jockeying: 5 mins backward running at 50% pace", "Lateral Bands: 3x15 side steps with resistance to activate glutes"]
        }
      },
      { 
        name: 'Goalkeeper', 
        specificDemands: ['Reaction Time', 'Explosive Power', 'Agility'], 
        highRiskRegions: ['Shoulder', 'Groin', 'Lower Back'],
        weights: { reaction: 40, power: 30, structural: 10, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Handling Fundamentals: 50 reps catching chest-high feeds with perfect W-grip", "Positional Angles: 10 mins positioning drills based on ball movement"],
          primed: ["Diving Reflexes: 20 reps point-blank saves with immediate recovery", "Cross Interception: 10 reps claiming high balls under pressure"],
          recovering: ["Footwork Focus: 5 mins shuffling between cones with 70% effort", "Reaction Board: 10 mins tracking deflected balls"]
        }
      }
    ]
  },
  kabaddi: {
    id: 'kabaddi',
    name: 'Kabaddi',
    topDemands: ['Explosive Power', 'Agility', 'Anaerobic Capacity'],
    highRiskRegions: ['Shoulder', 'Knee', 'Lower Back'],
    microQuestion: "How is your primary contact-ready body feel?",
    dashboardFocus: "contact readiness",
    precisionTemplates: {
      fatigued: { 
        what: "Delay high-impact contact drills until secondary warmup", 
        how: "Perform 10 minutes of extra joint mobilization before raiding/defending", 
        why: "Joint stiffness markers suggest reduced shock absorption capacity today." 
      },
      primed: { 
        what: "Maximal contact and explosive raiding window", 
        how: "Practice your primary strike/move at game speed early", 
        why: "Superior body feel and energy suggest high tissue tolerance today." 
      },
      recovering: { 
        what: "Focus on defensive positioning and footwork", 
        how: "Execute reactive drills at 60% speed; avoid heavy collisions", 
        why: "Recovery is positive but impact-readiness is still settling." 
      }
    },
    competitionProtocol: {
      pre: ["Dynamic mobility 30 mins before raid", "Warmup contact drills with partner", "Hydrate with electrolytes"],
      focus: "Quick escapes & firm ankle grips",
      nutrition: "Light snack 2 hrs before; electrolytes during match"
    },
    recoveryProtocol: {
      priority: "Joint Stability & Impact Recovery",
      targets: ["Soft tissue work on shoulders/knees", "Ice baths for impact zones", "Glute/core stability"]
    },
    positions: [
      { 
        name: 'Raider', 
        specificDemands: ['Explosive Power', 'Agility'], 
        highRiskRegions: ['Knee', 'Ankle'],
        weights: { explosiveness: 40, agility: 30, knee: 10, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Footwork Shadowing: 3 mins visualization of raid footwork without explosive take-offs", "Bonus Line Reaches: 15 reps of controlled functional stretching"],
          primed: ["Live Raid Simulation: 5 mins 1v3 attacking drills at 100% intensity", "Reaction Escapes: 10 reps breaking ankle holds against resistance bands"],
          recovering: ["Agility Cone Drill: 5 mins at 60% speed emphasizing body balance", "Core Stability: 3x45s side planks for mid-air body control"]
        }
      },
      { 
        name: 'Defender', 
        specificDemands: ['Strength', 'Reaction Time'], 
        highRiskRegions: ['Shoulder', 'Wrist'],
        weights: { strength: 40, reaction: 30, shoulder: 10, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Chain Coordination: 5 mins positional walking with your defensive partner", "Grip Strength: 3x15 wrist curls with light resistance"],
          primed: ["Block/Dash Simulation: 10 reps maximal force application against tackle bags", "Live Trapping: 5 mins 3v1 defensive coordination at 100% speed"],
          recovering: ["Stance Holds: 3x1min low defensive posture holds", "Ankle Catch Technique: 20 reps slow-motion form practice without impact"]
        }
      }
    ]
  },
  badminton: {
    id: 'badminton',
    name: 'Badminton',
    topDemands: ['Agility', 'Reaction Time', 'Explosive Power'],
    highRiskRegions: ['Ankle', 'Shoulder', 'Knee'],
    microQuestion: "How is your dominant lunging leg feeling today?",
    dashboardFocus: "lunge & reaction speed",
    precisionTemplates: {
      fatigued: { 
        what: "Keep first few high-speed court movements controlled", 
        how: "Check lunge comfort with 5-6 slow-motion reaches before full power", 
        why: "Shoulder and ankle fatigue today may affect stroke efficiency and reach early." 
      },
      primed: { 
        what: "Target maximal court coverage and smash speed", 
        how: "Execute full-speed footwork drills after a standard warmup", 
        why: "Freshness in dominant lunging leg allows for peak explosive output." 
      },
      recovering: { 
        what: "Prioritize stroke precision over court speed", 
        how: "Focus on wrist control and placement; limit deep backcourt lunges", 
        why: "Reaction time is stable but explosive leg recovery needs more window." 
      }
    },
    competitionProtocol: {
      pre: ["Active mobility for shoulder & ankle", "Rhythm footwork 20 mins before play", "Caffeine 30 mins before if neural load low"],
      focus: "Reaction speed & net precision",
      nutrition: "Sip carbs during long matches; immediate protein post-session"
    },
    recoveryProtocol: {
      priority: "Neural & Ankle Recovery",
      targets: ["Ankle mobility", "Shoulder external rotation stretches", "Quality sleep (9h target)"]
    },
    positions: [
      { 
        name: 'Singles Player', 
        specificDemands: ['Aerobic Endurance', 'Agility'], 
        highRiskRegions: ['Ankle', 'Knee'],
        weights: { endurance: 40, agility: 40, recovery: 20 },
        drills: {
          fatigued: ["Static Box Feeding: 50 shuttles focusing purely on wrist deception and placement", "Shadow Footwork: 3 mins slow-motion court coverage"],
          primed: ["Multi-Shuttle Drills: 10x20 shuttle high-intensity aerobic feeds", "Jump Smashes: 20 reps focusing on maximal vertical explosion"],
          recovering: ["Target Practice: 4 corners clearing drills at 60% intensity", "Half-Court Singles: 10 min game focusing purely on tactical positioning"]
        }
      },
      { 
        name: 'Doubles Player', 
        specificDemands: ['Reaction Time', 'Explosive Power'], 
        highRiskRegions: ['Shoulder', 'Lower Back'],
        weights: { reaction: 50, power: 30, recovery: 20 },
        drills: {
          fatigued: ["Flat Push/Drive: 5 mins stationary mid-court drives focusing on racket prep", "Serve/Return Practice: 20 reps tactical short serves"],
          primed: ["Front-Court Interception: 5 mins maximal speed reflexive net kills", "Rear-Court Attack: 3 mins continuous jump-smash feeding"],
          recovering: ["Defensive Blocks: 5 mins receiving smashes focusing on soft hands", "Partner Rotation: 5 mins slow-motion communication and switching drills"]
        }
      }
    ]
  },
  'field hockey': {
    id: 'field_hockey',
    name: 'Field Hockey',
    topDemands: ['Aerobic Endurance', 'Agility', 'Explosive Power'],
    highRiskRegions: ['Lower Back', 'Hamstring', 'Knee'],
    microQuestion: "Any stiffness in your lower back from the low-stance play?",
    dashboardFocus: "repeat sprint & structural freshness",
    precisionTemplates: {
      fatigued: { 
        what: "Start with light movement before any full-speed sprints.", 
        how: "Keep the first 15 minutes of stick-work at an easy pace.", 
        why: "Your hamstrings feel tight today, which could slow you down if you rush." 
      },
      primed: { 
        what: "Focus on high-speed sprints and hard efforts today.", 
        how: "Move into high-speed drills right after your warmup.", 
        why: "You're fully recovered and ready for high-intensity work." 
      },
      recovering: { 
        what: "Watch how much you sprint; focus on your positioning.", 
        how: "Limit your high-speed bursts to just a few per session.", 
        why: "Your back is a bit stiff, so take it easy with the low-stance sprints." 
      }
    },
    competitionProtocol: {
      pre: ["Dynamic posture prep (low stance focus)", "High-intensity short bursts 15 mins before", "Carb loading 3 hrs before"],
      focus: "Positioning & repetitive sprint ability",
      nutrition: "Hydration with sodium; glucose at halftime"
    },
    recoveryProtocol: {
      priority: "Lower Back & Hamstring Repair",
      targets: ["Hamstring active stretches", "Lower back decompression", "Hydration + Electrolytes"]
    },
    positions: [
      { 
        name: 'Midfielder', 
        specificDemands: ['Aerobic Endurance'], 
        highRiskRegions: ['Ankle'],
        weights: { aerobic: 30, sprintAbility: 30, lowerLimb: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Stationary Push Passing: 50 reps against a rebound board focusing on weight transfer", "Vision Scanning: 5 mins 3v1 rondo at 50% pace emphasizing head checks"],
          primed: ["Repeated Sprint Ability (RSA): 6x40m shuttles with ball carry and 20s recovery", "Box-to-Box Transition: 4x3min high-intensity small-sided games"],
          recovering: ["Low-Stance Shadowing: 5 mins backward jockeying without active tackling", "Aerobic Flush: 20 mins light jogging with stick handling focusing on nasal breathing"]
        }
      },
      { 
        name: 'Forward', 
        specificDemands: ['Agility', 'Explosive Power'], 
        highRiskRegions: ['Hamstring'],
        weights: { agility: 30, power: 30, hamstring: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Static Goal Shooting: 30 strikes from top of the D without a sprint lead-up", "Deflection Practice: 50 reps angling stick on incoming sweep hits"],
          primed: ["V-Drag Sprints: 5x15m maximal effort accelerations past a static defender", "1v1 Circle Entry: 10 mins attacking defender at full pace with shot completion"],
          recovering: ["Target Push-Outs: 20 relaxed strikes emphasizing technique over power", "Agility Ladder: 5 mins coordination work at 50% speed with stick carry"]
        }
      },
      { 
        name: 'Defender', 
        specificDemands: ['Strength', 'Mental Focus'], 
        highRiskRegions: ['Lower Back'],
        weights: { focus: 30, strength: 30, back: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Stationary Block Tackles: 20 reps focusing on stick angle and low posture", "Overhead Aerials: 20 reps focusing on core brace without run-up"],
          primed: ["Maximal Change of Direction: 6x10m 180-degree turn sprints shadowing an attacker", "Physical Duel Simulation: 10 mins 1v1 shielding and channeling drills"],
          recovering: ["Shadow Channeling: 5 mins backward running at 50% pace maintaining stick-to-ground", "Lateral Bands: 3x15 side steps with resistance to activate glutes"]
        }
      }
    ]
  },
  wrestling: {
    id: 'wrestling',
    name: 'Wrestling',
    topDemands: ['Strength', 'Anaerobic Capacity', 'Mental Focus'],
    highRiskRegions: ['Shoulder', 'Neck', 'Knee'],
    microQuestion: "How is your neck and shoulder stability feeling today?",
    dashboardFocus: "stability & strength",
    precisionTemplates: {
      fatigued: { what: "Prioritize technical stability over maximal explosive power", how: "Execute positioning drills at 70% intensity; avoid heavy neck/shoulder load", why: "Neck and shoulder stability markers suggest reduced structural safety today." },
      primed: { what: "Ideal day for high-intensity grappling and power execution", how: "Execute maximal effort technical throws early in the session", why: "Superior strength and mental focus markers suggest high performance capacity." },
      recovering: { what: "Focus on balance and grip rhythm", how: "Execute 15 mins of grip-work and low-stance movement at a controlled pace", why: "Systemic recovery is positive; maintain stable load to consolidate gains." }
    },
    positions: [
      { 
        name: 'Freestyle', 
        specificDemands: ['Explosive Power', 'Agility'], 
        highRiskRegions: ['Knee'],
        weights: { power: 30, agility: 30, knee: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Shadow Wrestling: 5 mins focusing purely on stance and level changes without a partner", "Pummeling: 3 mins light underhook digging at 50% resistance"],
          primed: ["Live Takedowns: 10 reps maximal effort double-leg shots against resistance", "Scramble Simulation: 5 mins continuous live wrestling from disadvantageous positions"],
          recovering: ["Technical Finishes: 15 reps focusing on the final step of a takedown without the explosive entry", "Grip Fighting: 5 mins 70% intensity hand-fighting"]
        }
      },
      { 
        name: 'Greco-Roman', 
        specificDemands: ['Strength', 'Mental Focus'], 
        highRiskRegions: ['Neck', 'Upper Back'],
        weights: { strength: 40, stability: 20, neck: 20, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Stance Holds: 3x1min low defensive posture holds focusing on neck brace", "Partner Drags: 10 reps arm drags emphasizing positioning over force"],
          primed: ["Maximal Throws: 10 reps suplex/throw simulation with a heavy dummy", "Live Upper-Body Grappling: 3x3min intense tie-up and throw rounds"],
          recovering: ["Pummel Flow: 5 mins continuous fluid underhook/overhook exchange", "Static Core & Neck: 3x45s wrestler's bridge holds"]
        }
      }
    ]
  },
  boxing: {
    id: 'boxing',
    name: 'Boxing',
    topDemands: ['Reaction Time', 'Anaerobic Capacity', 'Explosive Power'],
    highRiskRegions: ['Wrist/Hand', 'Shoulder', 'Head/Neck'],
    microQuestion: "Any impact-fatigue in your lead wrist or knuckles?",
    dashboardFocus: "impact readiness",
    precisionTemplates: {
      fatigued: { what: "Limit heavy bag work; focus on shadow boxing precision", how: "Keep punch impact light (below 50%) for the first half of the session", why: "Wrist/hand impact fatigue markers suggest reduced shock tolerance today." },
      primed: { what: "Target maximal punch velocity and reaction drills", how: "Integrate high-speed combination work early after specific hand warmup", why: "Excellent reaction time and energy suggest peak impact readiness." },
      recovering: { what: "Focus on defensive footwork and head movement", how: "Limit sparring intensity to 30%; focus on spatial defensive drills", why: "Recovery is ongoing; avoid heavy head-impact zones today." }
    },
    positions: [
      { 
        name: 'Lightweight', 
        specificDemands: ['Agility', 'Reaction Time'], 
        highRiskRegions: ['Ankle'],
        weights: { velocity: 40, reaction: 30, ankle: 10, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Mirror Shadow Boxing: 3x3mins focusing purely on evasive footwork and slips", "Double-End Bag: 5 mins focusing on rhythm tapping without power"],
          primed: ["Pad Work (Velocity): 3x3mins maximal speed 4-punch combinations with coach", "Agility Ring: 5 mins rapid in-and-out lateral movement drills"],
          recovering: ["Skip Rope: 10 mins continuous low-impact active recovery", "Technical Sparring: 3x3mins touch-sparring emphasizing distance management"]
        }
      },
      { 
        name: 'Heavyweight', 
        specificDemands: ['Strength', 'Explosive Power'], 
        highRiskRegions: ['Shoulder'],
        weights: { power: 40, strength: 30, shoulder: 10, sleep: 10, soreness: 10 },
        drills: {
          fatigued: ["Heavy Bag (Technical): 3x3mins focusing on hip rotation and punch mechanics at 50% power", "Clinch Work: 5 mins static positional control without strikes"],
          primed: ["Power Pad Work: 3x3mins maximal force single/double strike combinations", "Medicine Ball Throws: 3x10 reps explosive rotational wall throws"],
          recovering: ["Shadow Boxing (Weighted): 3x3mins with 1kg dumbbells focusing on slow, deliberate extension", "Interactive Defense: 3x3mins blocking and parrying drills"]
        }
      }
    ]
  },
  shooting: {
    id: 'shooting',
    name: 'Shooting',
    topDemands: ['Skill Precision', 'Mental Focus', 'Strength'],
    highRiskRegions: ['Upper Back', 'Shoulder', 'Wrist/Hand'],
    microQuestion: "Is your hold feels steady or noticeable tremor?",
    dashboardFocus: "steadiness & focus",
    precisionTemplates: {
      fatigued: { what: "Reduce total shot volume; focus on hold stability", how: "Limit consecutive shots to 3 before taking a 2-minute neural reset", why: "Upper back fatigue may induce subtle tremors affecting precision today." },
      primed: { what: "Maximize high-precision competition simulation", how: "Execute 100% focus shots with full gear early in the session", why: "Peak mental focus and lower stress markers suggest elite steadiness today." },
      recovering: { what: "Prioritize trigger-control technical work", how: "Execute dry-fire or light-load drills focusing solely on release rhythm", why: "Neural readiness is stable but structural freshness needs a lower volume." }
    },
    positions: [
      { 
        name: 'Rifle', 
        specificDemands: ['Mental Focus', 'Strength'], 
        highRiskRegions: ['Upper Back'],
        weights: { focus: 50, stillness: 30, back: 10, sleep: 10 },
        drills: {
          fatigued: ["Dry-Fire Holds: 10 reps of 30s static aiming without trigger pull", "Breathing Visualization: 5 mins seated respiratory rhythm syncing"],
          primed: ["Match Simulation: Full 60-shot qualifying round under strict timing", "Wind-Read Drills: 20 shots intentionally adapting to shifting conditions"],
          recovering: ["SCATT Analysis Session: 20 shots focusing purely on trace stability", "Position Rebuild: 15 mins breaking down and resetting the physical stance"]
        }
      },
      { 
        name: 'Pistol', 
        specificDemands: ['Skill Precision', 'Mental Focus'], 
        highRiskRegions: ['Shoulder', 'Wrist'],
        weights: { precision: 50, focus: 30, wrist: 10, sleep: 10 },
        drills: {
          fatigued: ["Blank Wall Drills: 20 dry-fires against a white background focusing solely on front sight focus", "Grip Consistency: 10 reps drawing and establishing identical grip pressure"],
          primed: ["Rapid Fire Simulation: 30 shots focusing on maximal speed within the 10-ring", "Precision Final: 10 shots with decimal scoring isolation"],
          recovering: ["Trigger Squeeze Isolation: 30 slow-motion dry fires ensuring zero muzzle movement", "Shoulder Isometric Holds: 3x1min extended arm holds with light weight"]
        }
      }
    ]

  },
  archery: {
    id: 'archery',
    name: 'Archery',
    topDemands: ['Skill Precision', 'Mental Focus', 'Strength'],
    highRiskRegions: ['Shoulder', 'Upper Back', 'Neck'],
    microQuestion: "How is your release-arm shoulder feeling today?",
    dashboardFocus: "release precision",
    precisionTemplates: {
      fatigued: { what: "Limit total draw count; focus on release smoothness", how: "Execute 40% of standard volume; prioritize technical 'feel' over score", why: "Shoulder fatigue markers suggest reduced hold consistency for high volumes today." },
      primed: { what: "Ideal day for distance testing and high-tension focus", how: "Execute maximal draw-weight sets early after specific shoulder mobilization", why: "Excellent upper back freshness suggests high stability for peak performance." },
      recovering: { what: "Prioritize rhythmic release drills at shorter distances", how: "Focus on draw-to-release timing over aiming precision for the first phase", why: "Structural recovery is positive; avoid prolonged hold-tension today." }
    },
    positions: [
      { 
        name: 'Recurve', 
        specificDemands: ['Strength', 'Mental Focus'], 
        highRiskRegions: ['Shoulder'],
        weights: { focus: 40, structural: 30, shoulder: 20, sleep: 10 },
        drills: {
          fatigued: ["Clicker Timing Drills: 15 reps drawing to anchor without releasing", "Band Pull-Aparts: 3x15 light resistance to activate rhomboids"],
          primed: ["Tournament Simulation: Full 72-arrow qualifying round under time pressure", "Distance Testing: 20 shots at 70m focusing on wind reading"],
          recovering: ["Blank Bale Shooting: 30 shots at 5m with eyes closed focusing purely on release feel", "Isometric Holds: 5 reps of 10s bow arm holds"]
        }
      },
      { 
        name: 'Compound', 
        specificDemands: ['Skill Precision', 'Mental Focus'], 
        highRiskRegions: ['Upper Back'],
        weights: { precision: 40, focus: 40, back: 10, sleep: 10 },
        drills: {
          fatigued: ["Release Execution: 20 shots using a string loop/trainer focusing on back tension", "Sight Picture Drills: 5 mins focusing on float and accepting the aim"],
          primed: ["Scoring Matches: 5x 15-arrow matches against a competitive baseline", "Micro-Aiming: 20 shots focusing on decimal scoring (spider) hits"],
          recovering: ["Volume Reduction: 30-40 shots total focusing on perfect execution over score", "Stabilizer Balance: 5 mins assessing bow tilt and bubble level"]
        }
      }
    ]
  },
  'table tennis': {
    id: 'table_tennis',
    name: 'Table Tennis',
    topDemands: ['Reaction Time', 'Agility', 'Skill Precision'],
    highRiskRegions: ['Wrist/Hand', 'Knee', 'Shoulder'],
    microQuestion: "How is your forearm and wrist flexibility today?",
    dashboardFocus: "reaction & precision",
    precisionTemplates: {
      fatigued: { what: "Focus on positioning; keep multi-ball drills light", how: "Limit explosive directional shifts to 60% speed; focus on hand-speed", why: "Lower body fatigue markers suggest reduced agility for wide-court reaches today." },
      primed: { what: "Maximize high-speed multi-directional drills", how: "Execute 100% intensity footwork and reaction drills early", why: "Peak reaction time and fresh muscle markers suggest elite court speed today." },
      recovering: { what: "Prioritize serve and short-game precision", how: "Execute 20 mins of placement drills with minimal explosive movement", why: "Neural readiness is high; allow legs more recovery window while honing touch." }
    },
    positions: [
      { 
        name: 'Attacker', 
        specificDemands: ['Explosive Power', 'Agility'], 
        highRiskRegions: ['Wrist'],
        weights: { reaction: 40, agility: 30, wrist: 20, sleep: 10 },
        drills: {
          fatigued: ["Serve & Receive: 20 mins focusing purely on 3rd ball precision without power", "Falkenberg Drill (Light): 5 mins focusing on footwork rhythm at 50% speed"],
          primed: ["High-Frequency Multi-Ball: 5 mins maximal speed alternating forehand/backhand smashes", "Counter-Looping: 10 mins mid-distance max effort topspin rallies"],
          recovering: ["Block & Chop: 10 mins defensive absorption drills to hone touch", "Service Practice: 30 serves varying spin and precise table placement"]
        }
      },
      { 
        name: 'Defender', 
        specificDemands: ['Reaction Time', 'Mental Focus'], 
        highRiskRegions: ['Knee'],
        weights: { focus: 40, reaction: 30, knee: 20, sleep: 10 },
        drills: {
          fatigued: ["Pips Control: 15 mins block and chop variation against a static feed", "Shadow Footwork: 5 mins slow-motion lateral court coverage"],
          primed: ["Random Direction Return: 10 mins reacting to maximal speed randomized multi-ball feeds", "Chop to Attack Transition: 5 mins drilling explosive steps into the table"],
          recovering: ["Target Defense: 10 mins guiding opponent smashes to specific table zones", "Slow Looping: 10 mins relaxed topspin rallies focusing on rhythm"]
        }
      }
    ]
  },
  weightlifting: {
    id: 'weightlifting',
    name: 'Weightlifting',
    topDemands: ['Strength', 'Explosive Power', 'Mental Focus'],
    highRiskRegions: ['Lower Back', 'Wrist/Hand', 'Knee'],
    microQuestion: "Any CNS fatigue or structural stiffness in your back?",
    dashboardFocus: "structural readiness",
    precisionTemplates: {
      fatigued: { what: "Focus on your form rather than the weight.", how: "Limit your lifts to 70% of your max; focus on a clean move.", why: "Your back feels stiff and your mind feels tired; stay safe today." },
      primed: { what: "Great day for testing your max strength.", how: "Move into your heavy sets after a good warmup.", why: "Your energy is high and your joints feel fresh. Ready to lift heavy." },
      recovering: { what: "Focus on your movement and light weights.", how: "Use 50-60% of your max weight but move it fast and clean.", why: "You're recovering well; keep your form perfect without over-tiring yourself." }
    },
    positions: [
      { 
        name: 'Olympic', 
        specificDemands: ['Explosive Power', 'Strength'], 
        highRiskRegions: ['Lower Back', 'Wrist'],
        weights: { strength: 40, power: 30, back: 20, sleep: 10 },
        drills: {
          fatigued: ["PVC Pipe Progressions: 50 reps perfecting triple extension without load", "Positional Pauses: 3x3 light snatches pausing at the knee and catch"],
          primed: ["Maximal Snatch/C&J Sets: Work up to 95%+ of 1RM following a primed wave", "Heavy Front Squats: 4x3 at 85%+ focusing on explosive upward drive"],
          recovering: ["Speed Pulls: 5x3 clean/snatch pulls at 60% maximizing bar velocity", "Overhead Stability: 4x5 light overhead squats focusing on core brace"]
        }
      }
    ]
  },
  squash: {
    id: 'squash',
    name: 'Squash',
    topDemands: ['Agility', 'Anaerobic Capacity', 'Explosive Power'],
    highRiskRegions: ['Ankle', 'Knee', 'Lower Back'],
    microQuestion: "How is your repeated lunging capacity feeling?",
    dashboardFocus: "lunge sharpness",
    precisionTemplates: {
      fatigued: { what: "Limit deep explosive lunges; focus on mid-court touch", how: "Keep lunge intensity at 70%; check knee/ankle comfort during warmup", why: "Lower body fatigue and stiffness suggest reduced shock tolerance in deep corners." },
      primed: { what: "Target maximal court speed and retrieval drills", how: "Execute full-intensity court-sprint work early in the session", why: "Fresh lunging leg markers suggest high tolerance for peak anaerobic efforts today." },
      recovering: { what: "Prioritize positioning and shot placement", how: "Limit total explosive movements; focus on early racket prep", why: "Systemic recovery is positive; maintain rhythm without peak joint stress." }
    },
    positions: [
      { 
        name: 'Singles', 
        specificDemands: ['Anaerobic Capacity', 'Agility'], 
        highRiskRegions: ['Knee'],
        weights: { agility: 35, capacity: 35, knee: 20, sleep: 10 },
        drills: {
          fatigued: ["Ghosting (Technical): 5 mins low-intensity court movement focusing purely on racket prep", "Static Drives: 10 mins hitting continuous rail shots focusing on length"],
          primed: ["Chaos Feeding: 10 mins reacting to unpredictable boasts and drops at maximal speed", "Conditioned Games: 3x5 mins playing only below the service line to force explosive retrievals"],
          recovering: ["Target Drops: 15 mins feeding self and executing drop shots into corners", "Figure-8 Movement: 5 mins smooth, continuous court coverage without explosive sprints"]
        }
      }
    ]
  },
  tennis: {
    id: 'tennis',
    name: 'Tennis',
    topDemands: ['Aerobic Endurance', 'Explosive Power', 'Agility'],
    highRiskRegions: ['Shoulder', 'Elbow', 'Knee'],
    microQuestion: "Any signs of load-fatigue in your serving shoulder?",
    dashboardFocus: "stroke power",
    precisionTemplates: {
      fatigued: { what: "Limit serve volume; focus on back-court rhythm", how: "Execute serves at 60-70% power; check shoulder/elbow comfort early", why: "Shoulder impact fatigue markers suggest reduced tolerance for high-velocity serves." },
      primed: { what: "Target maximal serve speed and explosive net work", how: "Integrate full-power serve practice early after specific shoulder prep", why: "Superior agility and fresh joint markers suggest peak stroke power today." },
      recovering: { what: "Prioritize groundstroke consistency and placement", how: "Focus on early ball preparation and technical follow-through", why: "Recovery is positive; maintain stable load while shielding high-impact zones." }
    },
    positions: [
      { 
        name: 'Baseliner', 
        specificDemands: ['Aerobic Endurance'], 
        highRiskRegions: ['Ankle'],
        weights: { aerobic: 40, agility: 30, ankle: 20, sleep: 10 },
        drills: {
          fatigued: ["Basket Feeding (Static): 20 mins hitting groundstrokes with minimal lateral movement", "Service Toss Practice: 50 reps catching the toss without swinging through"],
          primed: ["Spanish Drills (2v1): 15 mins continuous high-intensity baseline defense", "Inside-Out Forehand Sprints: 10 mins running around the backhand to crush forehands"],
          recovering: ["Cross-Court Rallies: 20 mins focusing purely on depth and consistency", "Shadow Swings: 10 mins focusing on kinetic chain rhythm"]
        }
      },
      { 
        name: 'Serve & Volley', 
        specificDemands: ['Explosive Power', 'Agility'], 
        highRiskRegions: ['Shoulder'],
        weights: { power: 40, agility: 30, shoulder: 20, sleep: 10 },
        drills: {
          fatigued: ["Volley Touch Drills: 15 mins soft-hands volleying from the service line", "Return of Serve (Blocked): 10 mins reading the serve and blocking without full swings"],
          primed: ["Serve +1 Strategy: 20 first serves followed immediately by an aggressive split-step volley", "Overhead Smashes: 15 mins reacting to high lobs with maximal downward force"],
          recovering: ["Kick Serve Spin Focus: 30 serves aiming for maximal RPMs rather than pace", "Approah Shot Placement: 15 mins slicing deep and transitioning forward"]
        }
      }
    ]
  },
  volleyball: {
    id: 'volleyball',
    name: 'Volleyball',
    topDemands: ['Explosive Power', 'Agility', 'Reaction Time'],
    highRiskRegions: ['Ankle', 'Shoulder', 'Knee'],
    microQuestion: "How is your vertical jump-landing feel today?",
    dashboardFocus: "explosive jump readiness",
    precisionTemplates: {
      fatigued: { what: "Limit peak-height jumping drills; focus on floor work", how: "Ensure soft landings; limit repetitive max vertical efforts by 50%", why: "Ankle and shoulder fatigue markers suggest reduced jump-landing stability today." },
      primed: { what: "Ideal day for maximal jump height and spike power", how: "Execute peak-level vertical work early in the session", why: "Freshness in primary jump muscle groups suggests high explosive tolerance today." },
      recovering: { what: "Prioritize positioning and soft-touch technical drills", how: "Focus on court-awareness and defensive digging with controlled jumps", why: "Structural recovery is ongoing; consolidate movement skills without max impact." }
    },
    positions: [
      { 
        name: 'Attacker/Spiker', 
        specificDemands: ['Explosive Power'], 
        highRiskRegions: ['Shoulder'],
        weights: { power: 45, reaction: 25, shoulder: 20, sleep: 10 },
        drills: {
          fatigued: ["Approach Footwork (No Jump): 20 reps dialing in the 3-step approach timing", "Standing Roll Shots: 15 mins focusing on arm swing mechanics without jumping"],
          primed: ["Max Jump Spiking: 20 reps hitting off live sets against a block at peak height", "Transition Attacking: 10 mins blocking then immediately transitioning off the net to attack"],
          recovering: ["Seated Arm Swings: 50 reps snapping the wrist against a wall", "Soft Block Drills: 15 mins pressing over the net without maximal lateral shifts"]
        }
      },
      { 
        name: 'Setter', 
        specificDemands: ['Reaction Time', 'Agility'], 
        highRiskRegions: ['Wrist'],
        weights: { reaction: 45, focus: 25, wrist: 20, sleep: 10 },
        drills: {
          fatigued: ["Medicine Ball Sets: 3x15 utilizing a heavy ball focusing purely on finger/wrist strength", "Static Target Setting: 20 mins pushing balls into a hoop from a stationary base"],
          primed: ["Jump Setting on the Move: 15 mins running down bad passes and jump setting to the pins", "Setter Dumps: 10 mins reading the block and aggressively attacking on 2"],
          recovering: ["Wall Setting (1-arm): 3 mins continuously setting against a wall alternating hands", "Posture Drills: 10 mins squaring shoulders to the target before releasing"]
        }
      },
      { 
        name: 'Libero', 
        specificDemands: ['Reaction Time', 'Agility'], 
        highRiskRegions: ['Knee'],
        weights: { reaction: 50, agility: 30, knee: 10, sleep: 10 },
        drills: {
          fatigued: ["Platform Passing: 20 mins receiving easy free balls focusing purely on forming early angles", "Reading the Hitter: 10 mins watching attackers arm swings without actually digging"],
          primed: ["Maximal Defensive Diving: 15 mins pursuing balls well outside the bodyline (pancakes, sprawls)", "Hard Driven Digs: 50 reps defending point-blank spikes from a box"],
          recovering: ["Shuffle Footwork: 5 mins low posture lateral shifting tracking the setter", "Serve Receive (Floaters): 20 reps dialing in platform stability against movement"]
        }
      }
    ]
  },
  judo: {
    id: 'judo',
    name: 'Judo',
    topDemands: ['Strength', 'Agility', 'Mental Focus'],
    highRiskRegions: ['Shoulder', 'Knee', 'Wrist/Hand'],
    microQuestion: "How is your grip strength and upper-body pull feel?",
    dashboardFocus: "combat readiness",
    precisionTemplates: {
      fatigued: { what: "Focus on technical positioning over maximal pull power", how: "Perform 15 mins extra mobility work for shoulder/knee before technical grappling", why: "Shoulder and knee stiffness markers suggest reduced structural safety in heavy exchanges." },
      primed: { what: "Maximize randori and high-intensity throw execution", how: "Execute maximal effort technical exchanges early in the session", why: "Superior strength and energy markers suggest peak combat tolerance today." },
      recovering: { what: "Prioritize grip-work and balance stability", how: "Execute 10-15 mins of controlled entries at 50% speed", why: "Recovery is positive; shield joints while maintaining sport-specific neural rhythm." }
    },
    positions: [
      { 
        name: 'Standard', 
        specificDemands: ['Strength', 'Agility'], 
        highRiskRegions: ['Shoulder', 'Knee'],
        weights: { strength: 40, stability: 30, shoulder: 20, sleep: 10 },
        drills: {
          fatigued: ["Uchikomi (Static): 50 reps focusing purely on entry mechanics and off-balancing without throws", "Gripping Drills: 10 mins hand-fighting sequences at 50% resistance"],
          primed: ["Randori (High Intensity): 5x3 mins maximal effort live grappling rounds", "Crash Pad Throws: 20 reps explosive full-impact throws focusing on amplitude"],
          recovering: ["Nagekomi (Controlled): 20 reps throwing a cooperative partner onto a crash mat", "Newaza (Groundwork): 15 mins positional sparring focusing on transitions"]
        }
      }
    ]
  },
  rowing: {
    id: 'rowing',
    name: 'Rowing',
    topDemands: ['Aerobic Endurance', 'Strength', 'Anaerobic Capacity'],
    highRiskRegions: ['Lower Back', 'Ribs', 'Wrist/Hand'],
    microQuestion: "Any tension in your ribs or lower back during the drive?",
    dashboardFocus: "drive power",
    precisionTemplates: {
      fatigued: { what: "Prioritize technical catch and rhythm over boat speed", how: "Execute 100% technical focus at lower stroke rates; limit high-tension intervals", why: "Lower back tension markers suggest reduced structural safety under peak drive power." },
      primed: { what: "Target maximal power output and high-rate intervals", how: "Execute threshold or sprint sets early after a thorough aerobic warmup", why: "Superior strength and engine markers suggest elite drive capacity today." },
      recovering: { what: "Focus on low-rate technical consistency", how: "Keep stroke rate below 20; focus on effortless boat feel and synchronization", why: "Systemic recovery is positive; maintain base engine without peak neural load." }
    },
    positions: [
      { 
        name: 'Sweep', 
        specificDemands: ['Strength', 'Aerobic Endurance'], 
        highRiskRegions: ['Lower Back'],
        weights: { power: 40, aerobic: 30, back: 20, sleep: 10 },
        drills: {
          fatigued: ["Pick Drill (Reverse): 20 mins building the stroke from arms-only to full slide", "Square Blade Rowing: 10 mins focusing on clean extraction and balance"],
          primed: ["Lactate Threshold Pieces: 3x10 mins at AT pace (Rate 24-26)", "Start Sequence Sprints: 10x 15-stroke maximal effort starts"],
          recovering: ["Steady State (UT2): 45-60 mins continuous low-intensity rowing (Rate 18-20)", "Pause Drills: 15 mins pausing at the finish to stabilize core"]
        }
      },
      { 
        name: 'Sculling', 
        specificDemands: ['Skill Precision', 'Aerobic Endurance'], 
        highRiskRegions: ['Wrist'],
        weights: { precision: 40, aerobic: 40, wrist: 10, sleep: 10 },
        drills: {
          fatigued: ["One-Arm Rowing: 10 mins alternating arms to isolate catch precision", "Feet-Out Rowing: 15 mins focusing on core connection at the finish"],
          primed: ["Power Intervals: 6x500m at 2k race pace with 2 mins rest", "High-Rate Bursts: 10x 1min ON / 1min OFF at maximal sustainable rate"],
          recovering: ["Blindfold Rowing: 10 mins (erg only) heightening proprioception and rhythm", "Light Technical Mileage: 40 mins easy emphasizing identical hand levels"]
        }
      }
    ]
  },
  fencing: {
    id: 'fencing',
    name: 'Fencing',
    topDemands: ['Reaction Time', 'Agility', 'Mental Focus'],
    highRiskRegions: ['Ankle', 'Knee', 'Wrist/Hand'],
    microQuestion: "How is your reaction-lunge speed today?",
    dashboardFocus: "reaction speed",
    precisionTemplates: {
      fatigued: { what: "Focus on technical parries; limit explosive lunges", how: "Keep footwork at 60% speed; check wrist/ankle readiness during warmup", why: "Ankle and wrist fatigue markers suggest reduced precision in sudden reactive moves." },
      primed: { what: "Maximize high-speed bout simulation and reaction work", how: "Execute full-intensity explosive lunging drills early in the session", why: "Peak reaction time and fresh muscle markers suggest elite fencing speed today." },
      recovering: { what: "Prioritize blade-work precision and hand rhythm", how: "Focus on target accuracy with minimal aggressive court movement", why: "Neural readiness is high; allow legs a longer recovery window while honing touch." }
    },
    positions: [
      { 
        name: 'Foil', 
        specificDemands: ['Reaction Time', 'Agility'], 
        highRiskRegions: ['Ankle'],
        weights: { reaction: 45, agility: 35, ankle: 10, sleep: 10 },
        drills: {
          fatigued: ["Static Target Practice: 10 mins precise point control on a wall target", "Glove Work: 5 mins slow-motion coach-led blade engagement distance drills"],
          primed: ["Decision/Reaction Bouting: 15 mins live bouts where coach dictates right-of-way scenarios", "Explosive Lunges: 20 reps maximal distance attacking attacks off a visual cue"],
          recovering: ["Shadow Fencing: 10 mins visualizing footwork and distance without a partner", "Parry-Riposte Drills: 15 mins controlled defensive blade actions"]
        }
      },
      { 
        name: 'Epee', 
        specificDemands: ['Mental Focus', 'Agility'], 
        highRiskRegions: ['Wrist'],
        weights: { focus: 45, reaction: 35, wrist: 10, sleep: 10 },
        drills: {
          fatigued: ["Target Control (Small Area): 10 mins hitting coin-sized targets on a dummy", "Patience Bouting: 10 mins conditioned bouting where attacking first is penalized"],
          primed: ["Counter-Attack Drills: 15 mins high-speed interception drills to the hand/arm", "Fleche Attacks: 15 reps maximal closing speed explosive attacks"],
          recovering: ["Distance Maintenance: 15 mins shadow matching a partner's advances and retreats", "Absence of Blade: 10 mins bouting focusing on avoiding engagement"]
        }
      },
      { 
        name: 'Sabre', 
        specificDemands: ['Explosive Power', 'Reaction Time'], 
        highRiskRegions: ['Knee'],
        weights: { power: 45, reaction: 35, knee: 10, sleep: 10 },
        drills: {
          fatigued: ["Footwork Variations: 10 mins slow-to-fast step combinations over the 4m line", "Hand Target Drills: 5 mins isolating wrist cuts to the cuff"],
          primed: ["Simultaneous Action Drills: 15 mins executing complex attacks in the middle off 'Allez'", "Box Bouting: 15 mins high-intensity 5-touch bouts"],
          recovering: ["Second Intention Execution: 15 mins drawing the parry to score on the riposte", "Technical Strip Work: 10 mins focusing on keeping the back foot grounded"]
        }
      }
    ]
  },
  basketball: {
    id: 'basketball',
    name: 'Basketball',
    topDemands: ['Explosive Power', 'Agility', 'Aerobic Endurance'],
    highRiskRegions: ['Ankle', 'Knee', 'Lower Back'],
    microQuestion: "How is your vertical explosiveness and ankle stability today?",
    dashboardFocus: "vertical freshness",
    precisionTemplates: {
      fatigued: { what: "Limit repetitive max vertical efforts; focus on handle/shooting", how: "Ensure soft landings in warmup; keep intensity below 70% in full-court transition", why: "Ankle and knee stiffness markers suggest reduced shock tolerance during high-velocity play." },
      primed: { what: "Ideal day for high-intensity transition and rim-attack drills", how: "Integrate 100% effort vertical work early after specific lower-body prep", why: "Superior power and agility markers suggest peak vertical freshness today." },
      recovering: { what: "Prioritize tactical positioning and shot precision", how: "Focus on half-court technical execution at a controlled aerobic pace", why: "Structural recovery is ongoing; maintain rhythm without max impact loading." }
    },
    competitionProtocol: {
      pre: ["Explosive jump prep", "Neural activation (short sprints)", "Carbs 3 hrs before tips"],
      focus: "Vertical freshness & decision speed",
      nutrition: "Isotonic drinks; protein + carb mix post-game"
    },
    recoveryProtocol: {
      priority: "Vertical Load Management",
      targets: ["Knee tension release", "Ankle stability work", "Full body foam roll"]
    },
    positions: [
      { 
        name: 'Point Guard', 
        specificDemands: ['Agility', 'Reaction Time', 'Anaerobic Capacity'], 
        highRiskRegions: ['Ankle', 'Knee'],
        weights: { agility: 40, handle: 30, ankle: 15, sleep: 15 },
        drills: {
          fatigued: ["Stationary Ball Handling: 10 mins two-ball complex dribbling", "Passing Vision: 10 mins identifying open teammates in transition simulation"],
          primed: ["Pick & Roll Navigation: 15 mins splitting hedges and attacking at speed", "Full-Court Press Escapes: 10 mins maximal effort handle vs double-team"],
          recovering: ["Free Throw Rhythm: 50 makes following 10m light jog", "Form Shooting: 15 mins focusing on identical release mechanics"]
        }
      },
      { 
        name: 'Shooting Guard / Small Forward', 
        specificDemands: ['Aerobic Endurance', 'Explosive Power', 'Skill Precision'], 
        highRiskRegions: ['Ankle', 'Hamstring'],
        weights: { shooting: 40, power: 30, recovery: 20, sleep: 10 },
        drills: {
          fatigued: ["Spot-Up Shooting: 100 makes from 5 spots at 60% intensity", "V-Cut Technique: 15 mins focusing on footwork without explosive bursts"],
          primed: ["Catch & Shoot Progressions: 50 Makes off high-speed screens", "Transition Finishing: 20 reps attacking the rim with contact"],
          recovering: ["Mid-Range Rhythm: 40 makes using floaters and pull-ups", "Defensive Sliding: 5 mins mirroring offensive player at 50% speed"]
        }
      },
      { 
        name: 'Power Forward / Center', 
        specificDemands: ['Strength', 'Explosive Power'], 
        highRiskRegions: ['Lower Back', 'Knee'],
        weights: { power: 40, strength: 30, structural: 20, sleep: 10 },
        drills: {
          fatigued: ["Post Positioning: 10 mins sealing the defender without jumping", "Static Rebounding: 20 reps timing the jump without maximal height"],
          primed: ["Rim Protection: 15 mins live blocking vs multiple attackers", "Drop Step Explosion: 15 reps maximal power finishes with contact"],
          recovering: ["Hook Shot Precision: 40 Makes each hand at 60% intensity", "Boxing Out: 5 mins technical positioning drills"]
        }
      }
    ]
  },
  'athletics (sprints)': {
    id: 'athletics_sprint',
    name: 'Athletics (Sprints)',
    topDemands: ['Explosive Power', 'Anaerobic Capacity', 'Reaction Time'],
    highRiskRegions: ['Hamstring', 'Achilles', 'Hip/Groin'],
    microQuestion: "Any tension in your hamstrings during the drive phase?",
    dashboardFocus: "drive power",
    precisionTemplates: {
      fatigued: { what: "Keep your first 3-4 drive phases controlled", how: "Limit initial effort to 75% intensity until hamstrings feel fluid", why: "Hamstring tension markers suggest reduced sharpness during peak acceleration." },
      primed: { what: "Maximal acceleration and top-speed window is open", how: "Execute full-intensity blocks or sprints early after dynamic warmup", why: "Superior power and reaction time markers suggest elite sprinting capacity today." },
      recovering: { what: "Focus on technical gait and frequency rhythm", how: "Execute 80% speed drills with 100% focus on foot-strike and technical form", why: "Muscular recovery is ongoing; maintain load but avoid peak CNS fatigue." }
    },
    positions: [
      { 
        name: '100m/200m', 
        specificDemands: ['Explosive Power'], 
        highRiskRegions: ['Hamstring'],
        weights: { power: 45, react: 25, hamstring: 20, sleep: 10 },
        drills: {
          fatigued: ["A-Skips & B-Skips: 5x30m focusing purely on mechanics", "Prowler Pushes: 4x20m heavy load walking pace"],
          primed: ["Block Starts: 6x30m maximal acceleration with electronic timing", "Flying Sprints: 4x20m top-speed zones"],
          recovering: ["Tempo Runs: 6x150m at 75% effort", "Fast Feet: 5x10s rapid ground contacts"]
        }
      },
      { 
        name: '400m', 
        specificDemands: ['Anaerobic Capacity'], 
        highRiskRegions: ['Calf', 'Hamstring'],
        weights: { anaerobic: 45, power: 25, recovery: 20, sleep: 10 },
        drills: {
          fatigued: ["Extensive Tempo: 8x200m at 65% effort", "Posture Holds: 4x30m bounding"],
          primed: ["Lactate Tolerance: 2x 300m-100m split runs at 95%", "Speed Endurance: 4x150m at 95%"],
          recovering: ["Curve Running: 4x60m at 80%", "Rhythm Runs: 300m-200m-100m step-downs"]
        }
      }
    ]
  },
  'athletics (distance)': {
    id: 'athletics_distance',
    name: 'Athletics (Distance)',
    topDemands: ['Aerobic Endurance', 'Mental Focus', 'Strength'],
    highRiskRegions: ['Knee', 'Shin', 'Foot/Heel'],
    microQuestion: "Notice any shin tightness or foot-strike discomfort?",
    dashboardFocus: "engine readiness",
    precisionTemplates: {
      fatigued: { what: "Maintain a steady aerobic pace; skip peak intervals", how: "Keep heart rate below 75% of max; focus on rhythmic breathing", why: "Leg freshness and sleep markers suggest reduced tolerance for high-intensity spikes today." },
      primed: { what: "Target high-intensity anaerobic threshold work", how: "Integrate interval peaks at planned intensity early in the run", why: "Fresh knee and foot-strike markers suggest high tolerance for impact loading today." },
      recovering: { what: "Prioritize low-impact aerobic volume", how: "Keep pace 10-15s slower than target; focus on effortless movement", why: "Systemic recovery is positive; focus on engine maintenance over peak output." }
    },
    positions: [
      { 
        name: 'Middle Distance', 
        specificDemands: ['Anaerobic Capacity', 'Aerobic Endurance'], 
        highRiskRegions: ['Achilles', 'Shin'],
        weights: { aerobic: 40, anaerobic: 40, structural: 10, sleep: 10 },
        drills: {
          fatigued: ["Pool Running: 30 mins to eliminate impact", "Fartlek Flow: 20 mins un-timed aerobic run"],
          primed: ["V02 Max Intervals: 6x800m at 95% effort", "Hill Repeats: 10x1min maximal uphill efforts"],
          recovering: ["Steady State: 45 mins at 70% intensity", "Strides: 6x60m relaxed build-ups"]
        }
      },
      { 
        name: 'Marathon', 
        specificDemands: ['Aerobic Endurance', 'Mental Focus'], 
        highRiskRegions: ['Knee', 'Hip'],
        weights: { aerobic: 50, mental: 20, knee: 15, sleep: 15 },
        drills: {
          fatigued: ["Cross-Training: 45 mins cycling or elliptical at 60% HR", "Zone 1 Recovery: 30-40 mins extremely light jogging"],
          primed: ["Long Run Build: 2 hours finishing last 5k at Goal Pace", "Threshold Intervals: 3x 5k at Threshold Pace"],
          recovering: ["Progression Run: 1 hour dropping 5s/km every 10 mins", "Form Focus: 40 mins easy emphasizing hip extension"]
        }
      }
    ]
  },
  'athletics (jumps/throws)': {
    id: 'athletics_jumps',
    name: 'Athletics (Jumps/Throws)',
    topDemands: ['Explosive Power', 'Skill Precision', 'Strength'],
    highRiskRegions: ['Ankle', 'Lower Back', 'Shoulder'],
    microQuestion: "How is your takeoff/release power feeling?",
    dashboardFocus: "takeoff power",
    precisionTemplates: {
      fatigued: { what: "Limit maximal effort takeoffs; focus on approach rhythm", how: "Keep approach speed at 80%; limit landing impact", why: "Ankle and back fatigue markers suggest reduced shock tolerance today." },
      primed: { what: "Ideal day for maximal effort jumps/throws", how: "Execute peak-level explosive work early in the session", why: "Fresh takeoff muscles and high energy suggest elite power tolerance." },
      recovering: { what: "Prioritize technical mechanics at lower intensity", how: "Execute 60% speed approaches; focus on release/takeoff angle", why: "Structural recovery is ongoing; consolidate skills without peak CNS load." }
    },
    positions: [
      { 
        name: 'Jumper (Long/Triple/High)', 
        specificDemands: ['Explosive Power', 'Agility'], 
        highRiskRegions: ['Ankle', 'Lower Back'],
        weights: { power: 50, react: 20, ankle: 20, sleep: 10 },
        drills: {
          fatigued: ["Approach Timing: 10 reps of approach run without the jump", "Box Lands: 15 reps focusing on soft eccentric landing"],
          primed: ["Max Vertical/Horizontal Jumps: 10 reps at 100% effort", "Short-Approach Jumps: 8 reps focusing on peak height/distance"],
          recovering: ["Bounding: 4x20m light technical bounds", "Core Stability: 3x1min heavy planks to protect lumbar"]
        }
      },
      { 
        name: 'Thrower (Shot/Discus/Javelin)', 
        specificDemands: ['Strength', 'Explosive Power'], 
        highRiskRegions: ['Shoulder', 'Lower Back', 'Elbow'],
        weights: { strength: 40, power: 40, shoulder: 10, sleep: 10 },
        drills: {
          fatigued: ["Static Release: 20 technical releases without a full rotation", "Medicine Ball Throws: 3x10 rotational throws"],
          primed: ["Maximal Throws: 15 full-intensity competition throws", "Explosive Cleans: 5x3 at 85% for neural drive"],
          recovering: ["Rhythm Throws: 20 reps at 60% power focusing on kinetic chain", "Shoulder Mobility: 15 mins focused band-work"]
        }
      }
    ]
  },
  'gymnastics': {
    id: 'gymnastics',
    name: 'Gymnastics',
    topDemands: ['Explosive Power', 'Agility', 'Strength'],
    highRiskRegions: ['Ankle', 'Wrist', 'Lower Back'],
    microQuestion: "How is your landing stability and wrist comfort today?",
    dashboardFocus: "impact & joint readiness",
    precisionTemplates: {
      fatigued: { what: "Prioritize low-impact technical work", how: "Focus on floor-work basics and mobility", why: "Joint markers suggest caution during peak impact loading today." },
      primed: { what: "Ideal for maximal effort tumbling and vault work", how: "Execute peak-intensity sets after thorough joint activation", why: "High power and excellent joint stability markers suggest elite readiness." },
      recovering: { what: "Focus on flexibility and core stabilization", how: "Keep repetitions moderate; emphasize perfect form", why: "Recovery is positive; strengthen structural foundations today." }
    },
    positions: [
      { name: 'Floor / Tumbling', specificDemands: ['Explosive Power', 'Agility'], highRiskRegions: ['Ankle', 'Knee'], weights: { power: 45, agility: 35, ankle: 20 } },
      { name: 'Apparatus (Bars/Rings)', specificDemands: ['Strength', 'Skill Precision'], highRiskRegions: ['Shoulder', 'Wrist'], weights: { strength: 50, skill: 30, shoulder: 20 } }
    ]
  },
  'cycling': {
    id: 'cycling',
    name: 'Cycling',
    topDemands: ['Aerobic Endurance', 'Anaerobic Capacity', 'Strength'],
    highRiskRegions: ['Knee', 'Lower Back', 'Neck'],
    microQuestion: "Any localized knee tension or lower back fatigue from the saddle?",
    dashboardFocus: "engine & quad freshness",
    precisionTemplates: {
      fatigued: { what: "Focus on recovery spins in Zone 1-2", how: "Maintain high cadence, low resistance", why: "Leg freshness markers suggest reduced tolerance for high-torque efforts today." },
      primed: { what: "Ideal for climb repeats or interval sprints", how: "Integrate peak power phases early in the ride", why: "Superior engine capacity and low quad fatigue suggest high readiness for load." },
      recovering: { what: "Maintain steady-state aerobic base", how: "Focus on rhythmic breathing and consistent power output", why: "Systemic recovery is ongoing; maintain volume without peak intensity." }
    },
    positions: [
      { name: 'Road / Endurance', specificDemands: ['Aerobic Endurance'], highRiskRegions: ['Knee'], weights: { aerobic: 60, focus: 20, knee: 20 } },
      { name: 'Sprints / Track', specificDemands: ['Explosive Power', 'Anaerobic Capacity'], highRiskRegions: ['Quad', 'Glute'], weights: { power: 50, capacity: 40, quad: 10 } }
    ]
  },
  'powerlifting': {
    id: 'powerlifting',
    name: 'Powerlifting',
    topDemands: ['Strength', 'Explosive Power', 'Mental Focus'],
    highRiskRegions: ['Lower Back', 'Knee', 'Shoulder'],
    microQuestion: "How is your spinal brace and bracing tension feeling today?",
    dashboardFocus: "absolute strength readiness",
    precisionTemplates: {
      fatigued: { what: "Focus on accessory work and technique", how: "Reduce RPE by 2-3 points; avoid maximal singles", why: "CNS fatigue and back soreness suggest reduced tolerance for peak loads today." },
      primed: { what: "Ideal for testing peak strength or heavy triples", how: "Execute primary lifts after specific CNS activation", why: "Fresh structural markers and high energy suggest elite force production capacity." },
      recovering: { what: "Prioritize hypertrophy and movement quality", how: "Execute sets at 60-70% 1RM focusing on perfect bracing", why: "Structural recovery is positive; consolidate movement patterns today." }
    },
    positions: [
      { name: 'Squat Specialist', specificDemands: ['Strength'], highRiskRegions: ['Knee', 'Lower Back'], weights: { strength: 60, structural: 30, sleep: 10 } },
      { name: 'Bench Press Specialist', specificDemands: ['Strength'], highRiskRegions: ['Shoulder', 'Elbow'], weights: { strength: 60, structural: 30, sleep: 10 } },
      { name: 'Deadlift Specialist', specificDemands: ['Strength'], highRiskRegions: ['Lower Back', 'Hip'], weights: { strength: 60, structural: 30, sleep: 10 } }
    ]
  },
  'taekwondo': {
    id: 'taekwondo',
    name: 'Taekwondo',
    topDemands: ['Agility', 'Explosive Power', 'Skill Precision'],
    highRiskRegions: ['Knee', 'Ankle', 'Hip'],
    microQuestion: "Any hip-flexor tightness or knee sensitivity from kicks?",
    dashboardFocus: "kick velocity & agility",
    precisionTemplates: {
      fatigued: { what: "Focus on slow-motion technical forms and stretching", how: "Limit explosive head-height kicks", why: "Hip and knee markers suggest reduced elasticity and explosive capacity today." },
      primed: { what: "Ideal for sparring drills and high-intensity target work", how: "Execute maximal power kick sets early in the session", why: "Excellent agility and hip freshness suggest high readiness for explosive movement." },
      recovering: { what: "Prioritize footwork and defensive positioning", how: "Maintain moderate intensity; focus on precise timing", why: "Structural recovery is ongoing; maintain rhythm without peak impact." }
    },
    positions: [
      { name: 'Sparring / Kyorgui', specificDemands: ['Agility', 'Reaction Time'], highRiskRegions: ['Ankle'], weights: { agility: 40, react: 30, ankle: 30 } },
      { name: 'Forms / Poomsae', specificDemands: ['Skill Precision', 'Strength'], highRiskRegions: ['Hip', 'Balance'], weights: { skill: 50, strength: 30, hip: 20 } }
    ]
  },
  'golf': {
    id: 'golf',
    name: 'Golf',
    topDemands: ['Skill Precision', 'Mental Focus', 'Strength'],
    highRiskRegions: ['Lower Back', 'Wrist', 'Shoulder'],
    microQuestion: "Any spinal rotation stiffness or lead-wrist sensitivity?",
    dashboardFocus: "rotational fluidity & skill precision",
    precisionTemplates: {
      fatigued: { what: "Focus on short-game and putting mechanics", how: "Limit full-swing drives; emphasize rotational mobility", why: "Lower back markers suggest reduced tolerance for high-velocity rotational torque today." },
      primed: { what: "Ideal for driving range sessions and full rounds", how: "Execute peak-swing speed work early in the session", why: "Excellent spinal fluidity and mental focus suggest high skill precision today." },
      recovering: { what: "Prioritize iron-play and rhythm control", how: "Execute sets focusing on identical tempo and balance", why: "Structural recovery is ongoing; maintain precision without peak rotational load." }
    },
    positions: [
      { name: 'Standard / Professional', specificDemands: ['Skill Precision', 'Mental Focus'], highRiskRegions: ['Lower Back', 'Wrist'], weights: { skill: 50, mental: 30, structural: 20 } }
    ]
  },
  'swimming (sprints)': {
    id: 'swimming_sprint',
    name: 'Swimming (Sprints)',
    topDemands: ['Explosive Power', 'Anaerobic Capacity', 'Skill Precision'],
    highRiskRegions: ['Shoulder', 'Lower Back'],
    microQuestion: "Any shoulder impingement or loss of pull-power?",
    dashboardFocus: "pull power",
    precisionTemplates: {
      fatigued: { what: "Focus on stroke technique; avoid max-effort sprints", how: "Keep intensity in Zone 2; focus on catch and pull-through", why: "Shoulder fatigue markers suggest reduced stroke efficiency under high load." },
      primed: { what: "Target maximal velocity and start-power drills", how: "Execute peak-intensity sets early after thorough warmup", why: "Excellent pull-power and mental focus suggest elite sprinting capacity." },
      recovering: { what: "Prioritize stroke rhythm and recovery efficiency", how: "Execute 70% effort sets focusing on streamlining and glide", why: "Structural recovery is positive; maintain engine without peak power spikes." }
    },
    positions: [
      { 
        name: 'Sprinter (50m/100m)', 
        specificDemands: ['Explosive Power', 'Anaerobic Capacity'], 
        highRiskRegions: ['Shoulder'],
        weights: { power: 45, capacity: 35, shoulder: 10, sleep: 10 },
        drills: {
          fatigued: ["Sculling: 200m focusing purely on hand-feel", "Fist Swimming: 100m focusing on forearm pull"],
          primed: ["Sprint Burst: 6x25m at 100% effort with 2 mins rest", "Dive Starts: 10 reps focusing on explosive takeoff"],
          recovering: ["Distance per Stroke: 4x50m focusing on minimum strokes", "Kick Set: 200m at moderate intensity"]
        }
      }
    ]
  },
  'swimming (distance)': {
    id: 'swimming_distance',
    name: 'Swimming (Distance)',
    topDemands: ['Aerobic Endurance', 'Mental Focus', 'Strength'],
    highRiskRegions: ['Shoulder', 'Knee'],
    microQuestion: "Any 'swimmer's shoulder' discomfort or knee strain?",
    dashboardFocus: "engine efficiency",
    precisionTemplates: {
      fatigued: { what: "Maintain aerobic mileage; skip threshold sets", how: "Keep heart rate stable; focus on rhythmic breathing and streamline", why: "Shoulder freshness and sleep markers suggest reduced tolerance for high-volume intensity." },
      primed: { what: "Target high-volume aerobic threshold mileage", how: "Integrate interval peaks at planned intensity early in the session", why: "Superior engine and mental focus suggest high endurance capacity today." },
      recovering: { what: "Prioritize low-intensity recovery mileage", how: "Focus on effortless movement and stroke symmetry", why: "Systemic recovery is positive; focus on engine maintenance over peak output." }
    },
    positions: [
      { 
        name: 'Distance (400m+)', 
        specificDemands: ['Aerobic Endurance'], 
        highRiskRegions: ['Shoulder'],
        weights: { aerobic: 50, mental: 20, shoulder: 15, sleep: 15 },
        drills: {
          fatigued: ["Snorkel Sets: 400m concentrating solely on body alignment", "Pull Buoy Work: 300m isolating upper body rhythm"],
          primed: ["Threshold Set: 10x100m at T-pace with 10s rest", "Negative Split: 800m second half faster than first"],
          recovering: ["Smooth Flow: 15 mins continuous swimming at conversation pace", "Technical Drills: 10 mins focusing on high-elbow catch"]
        }
      }
    ]
  },
  'other': {
    id: 'other',
    name: 'Other',
    topDemands: ['Aerobic Endurance', 'Strength', 'Agility'],
    highRiskRegions: ['Knee', 'Lower Back', 'Shoulder'],
    microQuestion: "Any specific joint or muscle discomfort today?",
    dashboardFocus: "general readiness",
    precisionTemplates: {
      fatigued: { what: "Light activity only; focus on mobility and flexibility", how: "Keep overall effort below 60%; prioritize recovery-oriented work", why: "General fatigue markers suggest a lighter session today." },
      primed: { what: "Great day for high-quality training across all domains", how: "Execute your most demanding training early in the session", why: "Excellent overall readiness for peak performance." },
      recovering: { what: "Active recovery with moderate technical work", how: "Focus on movement quality over intensity", why: "Recovery is on track; maintain activity without overloading." }
    },
    positions: [
      { name: 'General Athlete', specificDemands: ['Aerobic Endurance', 'Strength'], highRiskRegions: ['Knee', 'Lower Back'], weights: { aerobic: 30, strength: 30, structural: 25, sleep: 15 } }
    ]
  },
};


export function getSportData(sportId: string): SportData | undefined {
  if (!sportId) return undefined;
  return SPORTS_DATABASE[sportId.toLowerCase()];
}

export function getPositionData(sportId: string, positionName: string): SportPosition | undefined {
  const sport = getSportData(sportId);
  return sport?.positions.find(p => p.name === positionName);
}

// Lifestyle Demands Mapping for Normal Individuals (Phase 24)
export interface LifestyleProfile {
  id: string;
  name: string;
  demands: Record<PhysiologicalDemand, number>;
  recommendedSports: string[];
  guidance: {
    what: string;
    where: string;
    how: string;
  };
}

export const LIFESTYLE_MAP: Record<string, LifestyleProfile> = {
  sedentary: {
    id: 'sedentary',
    name: 'Office / Sedentary',
    demands: {
      'Aerobic Endurance': 4,
      'Strength': 2,
      'Explosive Power': 1,
      'Agility': 1,
      'Reaction Time': 1,
      'Skill Precision': 2,
      'Mental Focus': 4,
      'Anaerobic Capacity': 2,
      'Fatigue Resistance': 2
    },
    recommendedSports: ['swimming (sprints)', 'cycling', 'badminton'],
    guidance: {
      what: "Focus on systemic circulation and spinal decompression.",
      where: "Local pool or low-traffic cycling routes.",
      how: "Start with 20-minute rhythmic sessions; avoid high-impact jumps initially."
    }
  },
  active_labor: {
    id: 'active_labor',
    name: 'Manual / High Activity',
    demands: {
      'Aerobic Endurance': 3,
      'Strength': 4,
      'Explosive Power': 3,
      'Agility': 2,
      'Reaction Time': 2,
      'Skill Precision': 1,
      'Mental Focus': 3,
      'Anaerobic Capacity': 3,
      'Fatigue Resistance': 3
    },
    recommendedSports: ['wrestling', 'weightlifting', 'football'],
    guidance: {
      what: "Focus on movement efficiency and structural recovery.",
      where: "Functional fitness gyms or community wrestling clubs.",
      how: "Higher focus on mobility and eccentric control to balance daily loading."
    }
  },
  student: {
    id: 'student',
    name: 'Student / High Cognitive',
    demands: {
      'Aerobic Endurance': 2,
      'Strength': 2,
      'Explosive Power': 3,
      'Agility': 4,
      'Reaction Time': 4,
      'Skill Precision': 4,
      'Mental Focus': 5,
      'Anaerobic Capacity': 4,
      'Fatigue Resistance': 3
    },
    recommendedSports: ['basketball', 'table_tennis', 'squash'],
    guidance: {
      what: "Focus on neural reset and reaction-based play.",
      where: "College courts or local sports clubs.",
      how: "Short, high-intensity play to stimulate CNS recovery from mental cognitive load."
    }
  }
}
