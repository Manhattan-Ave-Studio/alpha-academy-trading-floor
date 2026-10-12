-- Step 1 after the migrations: set the mentor code.
-- Mentors type this code once, after creating their email login, to unlock the mentor panel.
-- Pick a phrase only mentors will know (at least 10 characters). Run in the Supabase SQL editor.

select private.set_mentor_code('replace-with-a-long-mentor-phrase');

-- Optional: make an existing email account a mentor directly (skip the code).
-- insert into public.mentors (user_id, display_name)
-- select id, 'Your Name' from auth.users where email = 'you@example.com';
