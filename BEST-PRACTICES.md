# Crystal Etching Converter - Security Best Practices

**Last Updated:** July 20, 2025

## Security First Approach

This document outlines security best practices for the Crystal Etching Converter. Always prioritize security over convenience.

## Authentication & Authorization

### Current State
- No authentication implemented (planned feature)
- All endpoints publicly accessible
- File management unrestricted

### Future Implementation
```python
# Use JWT tokens for authentication
from fastapi_jwt_auth import AuthJWT

@app.post("/login")
async def login(credentials: UserCredentials, Authorize: AuthJWT = Depends()):
    # Verify credentials against database
    # Create access token
    access_token = Authorize.create_access_token(subject=user.id)
    return {"access_token": access_token}
```

## Input Validation

### File Upload Security
```python
# Current implementation in main.py
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_image_file(file: UploadFile) -> None:
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Invalid file type")
    
    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large")
    
    # Verify actual file content (not just extension)
    file.file.seek(0)
    header = file.file.read(8)
    if not is_valid_image_header(header):
        raise HTTPException(400, "Invalid image file")
```

### Filename Sanitization
```python
import re
import uuid

def sanitize_filename(filename: str) -> str:
    # Remove path traversal attempts
    filename = os.path.basename(filename)
    
    # Remove special characters
    filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    
    # Use UUID for storage
    return f"{uuid.uuid4()}_{filename}"
```

## Data Storage Security

### File Storage
- Store files outside web root when possible
- Use unique filenames (UUIDs)
- Set restrictive permissions (644 for files, 755 for directories)
- Implement file expiration

### Database (Future)
```python
# Use parameterized queries - NEVER concatenate
# Good
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))

# Bad - SQL injection risk
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

## API Security

### Rate Limiting
```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/process", dependencies=[Depends(RateLimiter(times=10, minutes=1))])
async def process_image():
    # Limit to 10 requests per minute per IP
    pass
```

### CORS Configuration
```python
# Current: Open for development
# Production: Restrict to specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### Request Validation
```python
from pydantic import BaseModel, validator

class ProcessRequest(BaseModel):
    option: str
    
    @validator('option')
    def validate_option(cls, v):
        allowed = ['standard', 'high_quality']
        if v not in allowed:
            raise ValueError('Invalid option')
        return v
```

## Error Handling

### Safe Error Messages
```python
# Good - Generic message to user, detailed log
try:
    process_image(file)
except Exception as e:
    logger.error(f"Processing failed: {str(e)}", exc_info=True)
    raise HTTPException(500, "Processing failed. Please try again.")

# Bad - Exposes internal details
except Exception as e:
    raise HTTPException(500, f"Error: {str(e)}")
```

### Logging Best Practices
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure secure logging
handler = RotatingFileHandler(
    'app.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s'
))

logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Log security events
logger.info(f"File uploaded: {file_id} by {user_ip}")
logger.warning(f"Invalid file type attempted: {filename}")
logger.error(f"Processing failed for: {file_id}")
```

## Frontend Security

### XSS Prevention
```jsx
// React automatically escapes values
// Good
<div>{userInput}</div>

// Bad - Only use if absolutely necessary and input is sanitized
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

### Secure Communication
```javascript
// Always use HTTPS in production
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.yourdomain.com' 
  : 'http://localhost:8000'

// Add security headers
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
```

### Input Validation (Frontend)
```javascript
// Validate on frontend AND backend
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type')
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large')
  }
  
  return true
}
```

## Environment Security

### Environment Variables
```bash
# .env file (never commit to git)
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost/db
API_KEY=external-service-key

# Access securely
from dotenv import load_dotenv
load_dotenv()

secret_key = os.getenv("SECRET_KEY")
if not secret_key:
    raise ValueError("SECRET_KEY not set")
```

### Production Configuration
```python
# Disable debug mode
DEBUG = False

# Use secure session config
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'

# Force HTTPS
SECURE_SSL_REDIRECT = True
```

## Deployment Security

### File Permissions
```bash
# Set correct ownership
chown -R www-data:www-data /app

# Restrict permissions
find /app -type f -exec chmod 644 {} \;
find /app -type d -exec chmod 755 {} \;

# Sensitive files
chmod 600 .env
chmod 600 app.log
```

### Network Security
```bash
# Firewall rules (ufw)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
ufw enable
```

### Process Isolation
```ini
# systemd service configuration
[Service]
User=www-data
Group=www-data
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/app/static
```

## Security Checklist

### Before Deployment
- [ ] Remove all debug statements
- [ ] Set DEBUG=False
- [ ] Update CORS origins
- [ ] Set strong SECRET_KEY
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set file permissions
- [ ] Remove default passwords
- [ ] Enable rate limiting
- [ ] Set up log rotation

### Regular Maintenance
- [ ] Update dependencies monthly
- [ ] Review logs for anomalies
- [ ] Check disk usage
- [ ] Rotate secrets quarterly
- [ ] Security scan with tools
- [ ] Backup data regularly

## Common Vulnerabilities to Avoid

### 1. Path Traversal
```python
# Bad
file_path = f"static/{user_input}"

# Good
file_path = os.path.join("static", os.path.basename(user_input))
```

### 2. Command Injection
```python
# Bad
os.system(f"convert {filename} output.png")

# Good
subprocess.run(["convert", filename, "output.png"], check=True)
```

### 3. Denial of Service
- Implement rate limiting
- Set resource limits
- Validate file sizes
- Use timeouts

### 4. Information Disclosure
- Generic error messages
- No stack traces to users
- Secure logging
- Remove debug info

## Security Tools

### Dependency Scanning
```bash
# Python
pip install safety
safety check

# JavaScript
npm audit
npm audit fix
```

### Code Analysis
```bash
# Python
pip install bandit
bandit -r backend/

# JavaScript
npm install -g eslint-plugin-security
eslint --ext .js,.jsx frontend/
```

## Incident Response

### If Compromised
1. Take system offline
2. Preserve logs
3. Identify breach vector
4. Patch vulnerability
5. Reset all credentials
6. Notify affected users
7. Document lessons learned

### Monitoring
- Set up alerts for:
  - Failed login attempts
  - Large file uploads
  - Unusual API patterns
  - Error rate spikes
  - Disk space issues

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [React Security](https://react.dev/learn/security)
- [Python Security](https://python.readthedocs.io/en/latest/library/security_warnings.html)