# Backup and recovery assumptions

Hosted backup features and retention depend on the selected Supabase plan and project configuration; this repository does not promise a recovery point or recovery time. Before production, record the actual database backup schedule, point-in-time recovery availability, tested restore procedure, responsible operator, and acceptable RPO/RTO.

Database backups do not by themselves guarantee recovery of Storage objects. Treat user images and export files as separate object data and test their provider-specific recovery behaviour. A deleted account is removed from active Auth, database, and Storage systems by the application flow, but provider backups may retain database history until their configured expiry. Do not restore deleted-user data into active production without a reviewed legal/operational process.

Recovery exercises should cover: a failed migration roll-forward, accidental RLS/grant regression, Auth configuration drift, deleted or inaccessible storage objects, export-worker backlog, and credential compromise. Restore into an isolated project, rotate all copied credentials, run migrations and the full verification suite, compare expected object inventory, and validate User A/User B isolation before traffic resumes.

Exports are convenience portability artifacts, not backups. They expire after 24 hours and are not recoverable after cleanup. Rotate suspected database, JWT, OAuth, SMTP, legacy service-role, and current server-secret credentials; then redeploy functions and invalidate old operational access wherever supported.
