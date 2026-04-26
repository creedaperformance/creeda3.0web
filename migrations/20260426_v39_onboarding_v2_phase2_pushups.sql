BEGIN;

ALTER TABLE public.capacity_tests
  DROP CONSTRAINT IF EXISTS capacity_tests_test_type_check;

ALTER TABLE public.capacity_tests
  ADD CONSTRAINT capacity_tests_test_type_check CHECK (test_type IN (
    'resting_hr', 'cooper_run_12min', 'step_test_3min', 'run_1km', 'run_5km', 'run_10km',
    'sprint_100m', 'vertical_jump', 'broad_jump', 'rsi_drop_jump',
    'squat_1rm', 'deadlift_1rm', 'bench_1rm', 'ohp_1rm', 'pullup_amrap', 'pushup_amrap',
    'rsa_6x30m', 'farmers_carry', 'plank_hold',
    'fms_aslr_left', 'fms_aslr_right', 'fms_shoulder_left', 'fms_shoulder_right',
    'fms_trunk_pushup', 'fms_single_leg_squat_left', 'fms_single_leg_squat_right',
    'fms_inline_lunge_left', 'fms_inline_lunge_right',
    'overhead_squat_baseline', 'hrv_ppg'
  ));

COMMIT;
