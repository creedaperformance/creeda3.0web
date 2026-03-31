-- CREEDA V8: CORRECTED SEED DATA
-- Matches the updated v7 schema

-- ─── 1. EXERCISES ──────────────────────────────────────────────────────────
INSERT INTO public.exercises (id, name, description, movement_pattern, body_part, metabolic_score, neuromuscular_score, difficulty_level, equipment_required)
VALUES 
  (gen_random_uuid(), 'Back Squat', 'Compound lower body strength.', 'SQUAT', 'LOWER_BODY', 60, 90, 4, ARRAY['Barbell', 'Rack']),
  (gen_random_uuid(), 'Goblet Squat', 'Front-loaded squat for stability.', 'SQUAT', 'LOWER_BODY', 50, 60, 2, ARRAY['Dumbbell', 'Kettlebell']),
  (gen_random_uuid(), 'Deadlift', 'Primary posterior chain strength.', 'HINGE', 'POSTERIOR_CHAIN', 65, 95, 4, ARRAY['Barbell']),
  (gen_random_uuid(), 'Push Up', 'Bodyweight horizontal push.', 'PUSH', 'CHEST', 35, 50, 1, ARRAY['Bodyweight']),
  (gen_random_uuid(), 'Pull Up', 'Vertical pull for back strength.', 'PULL', 'BACK', 50, 85, 4, ARRAY['Pull-up Bar']),
  (gen_random_uuid(), 'A-Skip', 'Sprint mechanics drill.', 'SPRINT', 'FULL_BODY', 40, 60, 2, ARRAY['None']),
  (gen_random_uuid(), 'Hamstring Bridge', 'Isometric isolation for rehab.', 'REHAB', 'POSTERIOR_CHAIN', 20, 40, 1, ARRAY['None']);

-- ─── 2. FOODS (Indian-Centric) ──────────────────────────────────────────────
INSERT INTO public.foods (id, name, category, protein_per_100g, carbs_per_100g, fat_per_100g, cals_per_100g, is_vegetarian, is_vegan, is_jain)
VALUES
  (gen_random_uuid(), 'Paneer', 'PROTEIN', 18.0, 1.2, 20.8, 265, true, false, true),
  (gen_random_uuid(), 'Chicken Breast', 'PROTEIN', 31.0, 0.0, 3.6, 165, false, false, false),
  (gen_random_uuid(), 'Masoor Dal', 'PROTEIN/CARB', 9.0, 20.0, 0.4, 116, true, true, true),
  (gen_random_uuid(), 'Brown Rice', 'CARB', 2.6, 23.0, 0.9, 111, true, true, true),
  (gen_random_uuid(), 'Moong Dal Chilla', 'PROTEIN/CARB', 12.0, 45.0, 5.0, 280, true, true, true);

-- ─── 3. SPORT PROFILES ──────────────────────────────────────────────────────
INSERT INTO public.sport_profiles (sport, energy_system)
VALUES
  ('Cricket', '{"aerobic": 40, "anaerobic_lactic": 30, "anaerobic_alactic": 30}'),
  ('Football', '{"aerobic": 60, "anaerobic_lactic": 30, "anaerobic_alactic": 10}'),
  ('Basketball', '{"aerobic": 40, "anaerobic_lactic": 40, "anaerobic_alactic": 20}');

-- ─── 4. GOAL PROFILES ───────────────────────────────────────────────────────
INSERT INTO public.goal_profiles (goal_name, target_caloric_modifier, protein_ratio, carb_ratio, fat_ratio, sessions_per_week_recommended)
VALUES
  ('Performance Enhancement', 1.1, 0.3, 0.5, 0.2, 5),
  ('Injury Prevention', 1.0, 0.35, 0.4, 0.25, 4),
  ('Recovery Efficiency', 0.95, 0.3, 0.5, 0.2, 3);
