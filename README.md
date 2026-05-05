# Diskukmjt Prokesra Tagihan SIM

Google Apps Script project for managing billing schedules and simulations.

## Folder Structure

```
.
├── appsscript.json                 # Google Apps Script manifest configuration
├── Code.js                          # Main script file with primary functions
├── DialogSimSchedule.html           # HTML file for dialog UI components
└── utils/                           # Utility modules
    ├── sheet.js                     # Spreadsheet manipulation utilities
    ├── tagihan-schedule.js          # Billing schedule management
    ├── tagihan-simulation.js        # Billing simulation logic
    └── var.js                       # Shared variables and constants
```

## File Descriptions

- **appsscript.json**: Contains project manifest, dependencies, and deployment settings
- **Code.js**: Entry point with main execution functions and handlers
- **DialogSimSchedule.html**: Custom dialog UI for schedule simulation interface
- **utils/sheet.js**: Helper functions for Google Sheets operations
- **utils/tagihan-schedule.js**: Logic for creating and managing billing schedules
- **utils/tagihan-simulation.js**: Simulation engine for billing scenarios
- **utils/var.js**: Global variables, constants, and configuration values

## Common CLASP Commands

### Authentication

```bash
# Login to your Google account
clasp login

# Logout from Google account
clasp logout
```

### Development Workflow

#### Pull

```bash
# Pull the latest version from Google Drive to your local workspace
clasp pull

# This updates all local files to match the current deployment version
```

#### Push

```bash
# Push local changes to Google Drive (updates the script in Apps Script editor)
clasp push

# Push with description (for version tracking)
clasp push -m "Description of changes"

# Force push (overwrites remote version without confirmation)
clasp push --force
```

### Deployment

```bash
# List all versions
clasp versions

# Create a new version
clasp versions --create

# List all deployments
clasp deployments

# Create a new deployment
clasp deploy
```

### Useful Workflow

```bash
# 1. Check status before pushing
clasp status

# 2. Pull latest changes
clasp pull

# 3. Make local edits to your files

# 4. Push changes back
clasp push

# 5. View in editor
clasp open-script
```

## Prerequisite Setup

1. **Install CLASP CLI** (if not already installed):

   ```bash
   npm install -g @google/clasp
   ```

2. **Authenticate**:

   ```bash
   clasp login
   ```

3. **Pull the project** (if cloning from an existing project):

   ```bash
   clasp pull
   ```

4. **Make changes** to your local files

5. **Push changes** back to Google Apps Script:
   ```bash
   clasp push
   ```

## Tips

- Always `pull` before starting work to avoid conflicts
- Use descriptive commit messages with `clasp push -m "message"`
- Keep `utils/var.js` synchronized across development environments
- Test in the Google Apps Script editor before deployment
