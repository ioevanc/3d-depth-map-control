# IMPORTANT: System Documentation

**ALWAYS start by checking these documentation files to minimize context usage:**

1. **FILE-MAP.md** - EXACT paths to EVERY file - check this FIRST!
2. **SYSTEM-DOCUMENTATION.md** - Complete system overview and architecture
3. **DEVELOPMENT-GUIDE.md** - Quick navigation, common tasks, and troubleshooting
4. **BEST-PRACTICES.md** - Security standards and development best practices
5. **COMMON-PATTERNS.md** - Reusable code templates and patterns
6. **SECURITY-CHECKLIST.md** - Pre-deployment security verification
7. **SERVICE-AUTO-START.md** - Service management and monitoring setup

These files contain exact file paths and should be referenced BEFORE searching for files.

# 🔒 SECURITY REQUIREMENTS

**MANDATORY for ALL development:**

1. **NEVER hardcode credentials** - Use .env file ONLY
2. **ALWAYS validate input** - Both server-side and client-side
3. **USE parameterized queries** - Never concatenate SQL
4. **CHECK the old system** - OLD-SYSTEM-MAP.md shows what NOT to do
5. **FOLLOW official docs** - Laravel 11.x, Next.js 15.x, React 19
6. **RUN security checks** - Use SECURITY-CHECKLIST.md before deployment

When in doubt, check BEST-PRACTICES.md for the secure approach.

# Development Process

**⚠️ REMINDER: Update FILE-MAP.md IMMEDIATELY when creating/deleting/moving ANY file!**

1. First think through the problem, check the documentation files above, then write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
8. If user says they are running out of context, write detailed summary of current session to SESSION.md file (naming convention should be session-1.md, session-2.md etc, each session file should be date and time stamped at the top. Than prepare a good prompt that can be sent to a new session to flawlessly continue where we last left off, you will name this file next-session-prompt.md <handle gracefully this file will most likely already exist from teh previous session, overwrite with new session prompt> Both files should be placed inside the tasks directory.

# Documentation Updates

**CRITICAL**: When making ANY file system changes:
- **FILE-MAP.md** - UPDATE IMMEDIATELY when you:
  - Create a new file (add its exact path)
  - Delete a file (remove its entry)
  - Rename/move a file (update the path)
  - This is MANDATORY to keep the file map accurate!
- **SYSTEM-DOCUMENTATION.md** - Update if you change system architecture
- **DEVELOPMENT-GUIDE.md** - Update if you discover new patterns or solutions

Always update documentation BEFORE committing code changes.

IMPORTANT: ALL markdown files (.md) MUST be written to the /home/glassogroup-us5/htdocs/us5.glassogroup.com/tasks/ directory. This includes:
- todo.md
- session-*.md files
- next-session-prompt.md
- Any other documentation or planning files

The tasks directory path is: /home/glassogroup-us5/htdocs/us5.glassogroup.com/tasks/

# 🚨 CRITICAL SECURITY REMINDERS

1. **Email Credentials**: The old system has hardcoded Gmail passwords in Python scripts. NEVER copy these patterns. Always use environment variables.

2. **Common Security Mistakes to Avoid**:
   - MD5 password hashing (use bcrypt)
   - SQL string concatenation (use Eloquent/parameterized queries)
   - Unescaped user input in HTML (use proper escaping)
   - Public file uploads (store in private storage)
   - Debug mode in production (always OFF)
   - Exposed error messages (log, don't display)

3. **Before Writing Code**:
   - Check BEST-PRACTICES.md for the secure pattern
   - Review COMMON-PATTERNS.md for tested templates
   - Verify against SECURITY-CHECKLIST.md requirements

4. **Testing Commands** (run before marking task complete):
   ```bash
   npm run lint        # Frontend linting
   npm run typecheck   # TypeScript validation
   php artisan test    # Backend tests
   ```

5. **If Unsure**: Always choose the more secure option, even if it takes longer.
