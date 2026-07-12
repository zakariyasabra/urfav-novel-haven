-- Remove test account zekoosbr@gmail.com. Cascades to profiles/user_roles/etc via FKs.
DELETE FROM auth.users WHERE id = 'a17d521d-f089-42b6-98cc-390755167109';