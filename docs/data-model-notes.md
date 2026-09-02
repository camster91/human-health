# Core data model notes

Initial entities:
- users
- preferences
- goals
- programs
- program_sessions
- exercises
- exercise_variants
- exercise_equivalencies
- gym_profiles
- equipment
- workouts
- workout_exercises
- sets
- personal_records
- coach_recommendations
- capability_metrics
- assessments
- recovery_entries
- health_data_sources
- health_observations

Key rules:
- Sets are immutable historical facts once finalized; corrections are explicit edits with timestamps.
- Exercise variants keep independent progression histories.
- Imported health observations include source, captured_at, synced_at, freshness, and confidence/provenance metadata.
- Recommendations reference the observations/history used to generate them.
