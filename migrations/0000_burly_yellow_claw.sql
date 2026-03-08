CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500) NOT NULL,
	"badge_icon" varchar(255),
	"category" varchar(50) NOT NULL,
	"requirement_type" varchar(50) NOT NULL,
	"requirement_value" numeric(12, 2) NOT NULL,
	"requirement_exercise_id" varchar,
	"xp_reward" integer DEFAULT 0,
	"is_hidden" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255),
	"category" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer,
	"model" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generated_workouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_name" varchar(255) NOT NULL,
	"workout_type" varchar(50),
	"target_muscle_groups" jsonb,
	"estimated_duration_minutes" integer,
	"difficulty" varchar(20),
	"warmup" jsonb,
	"main_workout" jsonb,
	"cooldown" jsonb,
	"coaching_notes" text,
	"progression_suggestion" text,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" varchar(10) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"type" text DEFAULT 'training' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"recurrence_pattern" text DEFAULT 'none',
	"recurrence_end_date" text,
	"parent_appointment_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculator_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"calculator_type" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"notes" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_access_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"access_code" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_by" varchar NOT NULL,
	CONSTRAINT "client_access_codes_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "client_access_codes_access_code_unique" UNIQUE("access_code")
);
--> statement-breakpoint
CREATE TABLE "client_intake" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"trainer_id" varchar NOT NULL,
	"parq_heart_condition" boolean,
	"parq_chest_pain_activity" boolean,
	"parq_chest_pain_rest" boolean,
	"parq_dizziness" boolean,
	"parq_bone_joint" boolean,
	"parq_blood_pressure_meds" boolean,
	"parq_other_reason" boolean,
	"parq_other_details" text,
	"fitness_experience" text,
	"current_activity_level" text,
	"previous_injuries" text,
	"medical_conditions" text,
	"medications" text,
	"primary_goal" text,
	"secondary_goals" jsonb,
	"preferred_training_days" jsonb,
	"preferred_session_duration" integer,
	"dietary_restrictions" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relation" text,
	"consent_signed" boolean DEFAULT false,
	"consent_signed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"goal" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"age" integer,
	"gender" text,
	"height" numeric,
	"weight" numeric,
	"activity_level" text,
	"neck_circumference" numeric,
	"waist_circumference" numeric,
	"hip_circumference" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_session" timestamp,
	"next_session" timestamp
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"difficulty" text NOT NULL,
	"muscle_groups" text[] NOT NULL,
	"equipment" text[] NOT NULL,
	"instructions" text[] NOT NULL,
	"youtube_url" text,
	"exercise_type" text DEFAULT 'weighted_reps',
	"default_sets" integer,
	"default_reps" text,
	"default_duration" integer,
	"default_rest_time" integer,
	"thumbnail_url" text,
	"video_urls" text[],
	"alternative_exercises" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_in_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"billing_interval" text DEFAULT 'monthly' NOT NULL,
	"session_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_price_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"plan_id" varchar,
	"amount_in_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_invoice_id" text,
	"description" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_record_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	"estimated_1rm" numeric(6, 2) NOT NULL,
	"bodyweight_at_pr" numeric(5, 2),
	"workout_log_id" varchar,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	"estimated_1rm" numeric(6, 2) NOT NULL,
	"bodyweight_at_pr" numeric(5, 2),
	"relative_strength" numeric(4, 3),
	"workout_log_id" varchar,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"type" text NOT NULL,
	"value" numeric(8, 2) NOT NULL,
	"unit" text NOT NULL,
	"notes" text,
	"photo_url" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_meal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"target_calories" integer,
	"plan_data" jsonb NOT NULL,
	"source" varchar DEFAULT 'generator' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "user_fitness_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"height_cm" numeric(5, 2),
	"weight_kg" numeric(5, 2),
	"body_fat_percentage" numeric(4, 2),
	"gender" varchar(20),
	"date_of_birth" timestamp,
	"experience_level" varchar(20),
	"primary_goal" varchar(50),
	"secondary_goals" jsonb,
	"activity_level" varchar(20),
	"workout_frequency_per_week" integer,
	"workout_duration_minutes" integer,
	"preferred_workout_time" varchar(20),
	"workout_environment" varchar(20),
	"available_equipment" jsonb,
	"injuries" jsonb,
	"medical_conditions" jsonb,
	"dietary_preferences" jsonb,
	"allergies" jsonb,
	"daily_calorie_target" integer,
	"protein_target_grams" integer,
	"carbs_target_grams" integer,
	"fat_target_grams" integer,
	"location_enabled" boolean DEFAULT false,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"preferred_stores" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_fitness_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"xp_to_next_level" integer DEFAULT 100 NOT NULL,
	"rank_gen_z" varchar(20) DEFAULT 'NPC',
	"rank_strength" varchar(20) DEFAULT 'Untrained',
	"rank_percentile" numeric(5, 2),
	"current_streak_days" integer DEFAULT 0,
	"longest_streak_days" integer DEFAULT 0,
	"last_workout_date" timestamp,
	"total_workouts_completed" integer DEFAULT 0,
	"total_volume_lifted_kg" numeric(12, 2) DEFAULT '0',
	"total_reps_completed" integer DEFAULT 0,
	"total_sets_completed" integer DEFAULT 0,
	"total_workout_minutes" integer DEFAULT 0,
	"total_personal_records" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_gamification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_muscle_fatigue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"muscle_group" varchar(30) NOT NULL,
	"fatigue_level" numeric(5, 2) DEFAULT '0',
	"last_trained_at" timestamp,
	"estimated_full_recovery_at" timestamp,
	"volume_last_session" numeric(10, 2),
	"sets_last_session" integer,
	"avg_recovery_hours" numeric(5, 2) DEFAULT '48',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_muscle_volume" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"muscle_group" varchar(30) NOT NULL,
	"volume_this_week_kg" numeric(10, 2) DEFAULT '0',
	"sets_this_week" integer DEFAULT 0,
	"volume_this_month_kg" numeric(12, 2) DEFAULT '0',
	"sets_this_month" integer DEFAULT 0,
	"total_volume_kg" numeric(14, 2) DEFAULT '0',
	"total_sets" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_onboarding_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"welcome_modal_completed" boolean DEFAULT false NOT NULL,
	"selected_goal" text,
	"added_first_client" boolean DEFAULT false NOT NULL,
	"created_first_workout" boolean DEFAULT false NOT NULL,
	"assigned_first_workout" boolean DEFAULT false NOT NULL,
	"scheduled_first_session" boolean DEFAULT false NOT NULL,
	"logged_first_progress" boolean DEFAULT false NOT NULL,
	"completed_product_tour" boolean DEFAULT false NOT NULL,
	"dismissed_feature_prompts" text[] DEFAULT '{}',
	"onboarding_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_onboarding_progress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_strength_standards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"current_1rm" numeric(6, 2),
	"bodyweight" numeric(5, 2),
	"relative_strength" numeric(4, 3),
	"classification" varchar(20),
	"percentile" numeric(5, 2),
	"next_level_target" numeric(6, 2),
	"next_level_classification" varchar(20),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password" varchar,
	"email_verified" boolean DEFAULT false NOT NULL,
	"auth_provider" varchar DEFAULT 'local' NOT NULL,
	"auth_provider_id" varchar,
	"role" text DEFAULT 'solo' NOT NULL,
	"trainer_id" varchar,
	"is_independent" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" integer DEFAULT 0,
	"stripe_customer_id" varchar,
	"subscription_status" varchar,
	"subscription_tier" varchar,
	"subscription_id" varchar,
	"subscription_current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"notification_preferences" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "workout_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"scheduled_date" text,
	"day_of_week" integer,
	"week_number" integer,
	"week_year" integer,
	"scheduled_time" text,
	"timezone" text DEFAULT 'UTC',
	"duration_minutes" integer,
	"is_customized" boolean DEFAULT false,
	"custom_title" text,
	"custom_notes" text,
	"status" text DEFAULT 'scheduled',
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"notifications_sent" jsonb
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"sets" integer NOT NULL,
	"reps" text NOT NULL,
	"weight" text,
	"rest_time" integer,
	"sets_configuration" jsonb,
	"sort_order" integer NOT NULL,
	"group_id" varchar,
	"group_type" text
);
--> statement-breakpoint
CREATE TABLE "workout_recovery_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_log_id" varchar,
	"muscles_worked" jsonb,
	"perceived_exertion" integer,
	"muscle_soreness" integer,
	"sleep_quality_last_night" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_log_id" varchar,
	"workout_assignment_id" varchar,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"is_active" boolean DEFAULT true,
	"current_exercise_index" integer DEFAULT 0,
	"current_set_index" integer DEFAULT 0,
	"rest_timer_seconds" integer DEFAULT 90,
	"rest_timer_end_at" timestamp,
	"total_rest_time" integer DEFAULT 0,
	"total_active_time" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "workout_set_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" numeric(6, 2),
	"reps" integer,
	"duration" integer,
	"distance" numeric(8, 2),
	"rpe" integer,
	"is_warmup" boolean DEFAULT false,
	"is_drop_set" boolean DEFAULT false,
	"is_failure" boolean DEFAULT false,
	"notes" text,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"duration" integer NOT NULL,
	"difficulty" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"source_id" varchar,
	"source_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_requirement_exercise_id_exercises_id_fk" FOREIGN KEY ("requirement_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_conversations" ADD CONSTRAINT "ai_chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_conversation_id_ai_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generated_workouts" ADD CONSTRAINT "ai_generated_workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculator_results" ADD CONSTRAINT "calculator_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_access_codes" ADD CONSTRAINT "client_access_codes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_access_codes" ADD CONSTRAINT "client_access_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intake" ADD CONSTRAINT "client_intake_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intake" ADD CONSTRAINT "client_intake_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_payment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_record_history" ADD CONSTRAINT "personal_record_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_record_history" ADD CONSTRAINT "personal_record_history_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal_plans" ADD CONSTRAINT "saved_meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fitness_profile" ADD CONSTRAINT "user_fitness_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_muscle_fatigue" ADD CONSTRAINT "user_muscle_fatigue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_muscle_volume" ADD CONSTRAINT "user_muscle_volume_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "user_onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strength_standards" ADD CONSTRAINT "user_strength_standards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strength_standards" ADD CONSTRAINT "user_strength_standards_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_assignments" ADD CONSTRAINT "workout_assignments_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_assignments" ADD CONSTRAINT "workout_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_recovery_log" ADD CONSTRAINT "workout_recovery_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_assignment_id_workout_assignments_id_fk" FOREIGN KEY ("workout_assignment_id") REFERENCES "public"."workout_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set_logs" ADD CONSTRAINT "workout_set_logs_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set_logs" ADD CONSTRAINT "workout_set_logs_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_user_id" ON "ai_chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_active" ON "ai_chat_conversations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_id" ON "ai_chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_created_at" ON "ai_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_date" ON "ai_chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_workouts_user_id" ON "ai_generated_workouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_workouts_created_at" ON "ai_generated_workouts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ai_usage_user_date" ON "ai_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user_id" ON "ai_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_trainer_id" ON "appointments" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_client_id" ON "appointments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_date" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointments_trainer_date" ON "appointments" USING btree ("trainer_id","date","status");--> statement-breakpoint
CREATE INDEX "idx_calculator_results_user_id" ON "calculator_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calculator_results_type" ON "calculator_results" USING btree ("calculator_type");--> statement-breakpoint
CREATE INDEX "idx_calculator_results_user_type" ON "calculator_results" USING btree ("user_id","calculator_type");--> statement-breakpoint
CREATE INDEX "idx_calculator_results_created_at" ON "calculator_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_client_access_codes_client_id" ON "client_access_codes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_access_codes_access_code" ON "client_access_codes" USING btree ("access_code");--> statement-breakpoint
CREATE INDEX "idx_client_access_codes_is_active" ON "client_access_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_client_intake_client_id" ON "client_intake" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_intake_trainer_id" ON "client_intake" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_clients_trainer_id" ON "clients" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_clients_status" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_clients_email" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_feed" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_payment_plans_trainer_id" ON "payment_plans" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_trainer_id" ON "payments" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_client_id" ON "payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pr_history_user_id" ON "personal_record_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pr_history_exercise_id" ON "personal_record_history" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_pr_history_achieved_at" ON "personal_record_history" USING btree ("achieved_at");--> statement-breakpoint
CREATE INDEX "idx_personal_records_user_id" ON "personal_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_personal_records_exercise_id" ON "personal_records" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_personal_records_user_exercise" ON "personal_records" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "idx_progress_entries_client_id" ON "progress_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_progress_entries_recorded_at" ON "progress_entries" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_progress_entries_client_type_date" ON "progress_entries" USING btree ("client_id","type","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_saved_meal_plans_user_id" ON "saved_meal_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_training_sessions_trainer_id" ON "training_sessions" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_training_sessions_client_id" ON "training_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_training_sessions_scheduled_at" ON "training_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_training_sessions_status" ON "training_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_user_id" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_achievement_id" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_achievements_unique" ON "user_achievements" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "idx_user_fitness_profile_user_id" ON "user_fitness_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_gamification_user_id" ON "user_gamification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_gamification_total_xp" ON "user_gamification" USING btree ("total_xp");--> statement-breakpoint
CREATE INDEX "idx_user_gamification_current_level" ON "user_gamification" USING btree ("current_level");--> statement-breakpoint
CREATE INDEX "idx_muscle_fatigue_user_id" ON "user_muscle_fatigue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_muscle_fatigue_user_muscle" ON "user_muscle_fatigue" USING btree ("user_id","muscle_group");--> statement-breakpoint
CREATE INDEX "idx_muscle_volume_user_id" ON "user_muscle_volume" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_muscle_volume_user_muscle" ON "user_muscle_volume" USING btree ("user_id","muscle_group");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_user_id" ON "user_onboarding_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_strength_standards_user_id" ON "user_strength_standards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_strength_standards_user_exercise" ON "user_strength_standards" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_trainer_id" ON "users" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_auth_provider" ON "users" USING btree ("auth_provider","auth_provider_id");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_workout_id" ON "workout_assignments" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_client_id" ON "workout_assignments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_assigned_at" ON "workout_assignments" USING btree ("assigned_at");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_scheduled_date" ON "workout_assignments" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_client_date" ON "workout_assignments" USING btree ("client_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_week" ON "workout_assignments" USING btree ("week_year","week_number","client_id");--> statement-breakpoint
CREATE INDEX "idx_workout_assignments_status" ON "workout_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workout_exercises_workout_id" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "idx_workout_exercises_exercise_id" ON "workout_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_recovery_log_user_id" ON "workout_recovery_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recovery_log_created_at" ON "workout_recovery_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_user_id" ON "workout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_active" ON "workout_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_workout_set_logs_session" ON "workout_set_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_workout_set_logs_exercise" ON "workout_set_logs" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_workout_set_logs_session_exercise" ON "workout_set_logs" USING btree ("session_id","exercise_id","set_number");--> statement-breakpoint
CREATE INDEX "idx_workouts_trainer_id" ON "workouts" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_workouts_category" ON "workouts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_workouts_difficulty" ON "workouts" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_xp_transactions_user_id" ON "xp_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_xp_transactions_created_at" ON "xp_transactions" USING btree ("created_at");