# Crystal Etching Converter - Deployment Instructions

## Overview
This guide covers deploying the 2D to 3D Crystal Etching Converter on your Vultr instance with CloudPanel.

## Prerequisites
- Ubuntu 24.04 server with CloudPanel installed
- SSH access to the server
- Python 3.12+
- Node.js 18+ and npm

## Backend Setup

### 1. SSH into your server and navigate to the project
```bash
ssh root@your-server-ip
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com
```

### 2. Install Python and create virtual environment
```bash
# Install Python dependencies
apt update
apt install python3.12 python3.12-venv python3.12-dev

# Create virtual environment
cd backend
python3.12 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

### 3. Install Python packages
```bash
# Install PyTorch CPU-only version first
pip install torch==2.4.0+cpu torchvision==0.19.0+cpu torchaudio==2.4.0+cpu -f https://download.pytorch.org/whl/torch_stable.html

# Install other requirements
pip install -r requirements.txt
```

### 4. Test the backend
```bash
# Run the backend manually to test
uvicorn main:app --host 0.0.0.0 --port 8000

# Test with curl (in another terminal)
curl -F "image=@test_photo.jpg" http://localhost:8000/process
```

### 5. Set up systemd service
```bash
# Copy service file
sudo cp fastapi.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable fastapi
sudo systemctl start fastapi

# Check status
sudo systemctl status fastapi
```

## Frontend Setup

### 1. Navigate to frontend directory
```bash
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend
```

### 2. Install Node.js dependencies
```bash
npm install
```

### 3. Build the production bundle
```bash
npm run build
```

This creates a `dist` folder with the production-ready files.

## Nginx Configuration

### 1. In CloudPanel, navigate to your site settings

### 2. Add custom Nginx configuration:
- Go to the "Nginx Settings" or "Vhost" section
- Add the contents from `nginx.conf` file
- Save and reload Nginx

### 3. Ensure proper permissions
```bash
# Set ownership for static files
chown -R www-data:www-data /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend/static
chmod 755 /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend/static
```

## Security Configuration

### 1. Set up firewall (if not using CloudPanel's firewall)
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

### 2. Configure environment variables
```bash
# Edit the .env file in backend directory
nano /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend/.env
```

## Testing the Complete System

### 1. Check all services are running
```bash
# Check FastAPI backend
sudo systemctl status fastapi

# Check Nginx
sudo systemctl status nginx
```

### 2. Access the application
- Open your browser and navigate to: `http://your-domain.com`
- You should see the Crystal Etching Converter interface

### 3. Test the workflow
1. Upload a test image (JPG or PNG)
2. Click "Generate Depth Map & DXF"
3. Download both outputs and verify they work

## Troubleshooting

### Backend Issues
```bash
# View backend logs
sudo journalctl -u fastapi -f

# Restart backend
sudo systemctl restart fastapi
```

### Frontend Issues
```bash
# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Rebuild frontend if needed
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend
npm run build
```

### Model Download Issues
The Depth Anything V2 model will download automatically on first use. Ensure:
- The server has internet connectivity
- Sufficient disk space (~200MB for model)
- Write permissions in the home directory

### Performance Optimization
For low-spec servers (1 vCPU, 2GB RAM):
- Process one image at a time
- Consider adding swap space if needed:
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

## Maintenance

### Updating the Application
```bash
# Backend updates
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend
source venv/bin/activate
pip install --upgrade -r requirements.txt
sudo systemctl restart fastapi

# Frontend updates
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend
npm install
npm run build
```

### Cleaning Temporary Files
```bash
# Set up a cron job to clean old files
crontab -e

# Add this line to clean files older than 24 hours
0 2 * * * find /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend/static -name "*.png" -o -name "*.dxf" -mtime +1 -delete
```

## Support

For issues:
1. Check the logs first
2. Ensure all dependencies are installed correctly
3. Verify file permissions
4. Test each component individually