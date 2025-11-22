# Deployment Scripts Guide

Automated deployment scripts untuk IoT Gateway service di server production.

---

## 📋 Available Scripts

### 1. **setup.sh** - First Time Setup
Setup awal untuk deployment pertama kali di server baru.

**Usage:**
```bash
./scripts/setup.sh
```

**What it does:**
- ✅ Check Node.js & npm installation
- ✅ Install PM2 globally
- ✅ Install dependencies
- ✅ Create .env from template
- ✅ Build application
- ✅ Setup PM2 startup
- ✅ Start service with PM2
- ✅ Save PM2 configuration

**When to use:** First time deployment on new server

---

### 2. **deploy.sh** - Full Deployment
Complete deployment process untuk update aplikasi.

**Usage:**
```bash
./scripts/deploy.sh [production|staging]
```

**Examples:**
```bash
./scripts/deploy.sh production    # Deploy to production
./scripts/deploy.sh staging       # Deploy to staging
./scripts/deploy.sh               # Default: production
```

**What it does:**
- ✅ Pull latest code from Git
- ✅ Install dependencies
- ✅ Build application
- ✅ Stop existing PM2 process
- ✅ Start new PM2 process
- ✅ Save PM2 configuration
- ✅ Show status and logs

**When to use:** Regular deployments, major updates

---

### 3. **quick-deploy.sh** - Quick Update
Quick deployment untuk update minor/hotfix.

**Usage:**
```bash
./scripts/quick-deploy.sh
```

**What it does:**
- ✅ Pull latest code
- ✅ Install dependencies
- ✅ Build application
- ✅ Restart PM2 process
- ✅ Show recent logs

**When to use:** Quick updates, hotfixes, minor changes

---

## 🚀 Deployment Workflow

### First Time Deployment (New Server)

```bash
# 1. Clone repository
git clone <repository-url>
cd iot-gtw

# 2. Run setup script
./scripts/setup.sh

# 3. Edit .env file with your configuration
nano .env

# 4. Verify service is running
pm2 status
curl http://localhost:4000/api/health
```

---

### Regular Deployment (Updates)

```bash
# Full deployment
./scripts/deploy.sh production

# Or quick deployment
./scripts/quick-deploy.sh
```

---

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Restart PM2
pm2 restart iot-gateway

# Or start fresh
pm2 delete iot-gateway
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 🔧 Script Configuration

### Environment Variables

Scripts use these default values:

```bash
APP_NAME="iot-gateway"
SERVICE_DIR="$HOME/iot-service/iot-gtw"
ENVIRONMENT="production"
```

### Customize Service Directory

Edit script and change `SERVICE_DIR`:

```bash
# In deploy.sh or setup.sh
SERVICE_DIR="/path/to/your/iot-gtw"
```

---

## 📊 Post-Deployment Checks

After deployment, verify:

### 1. Check PM2 Status
```bash
pm2 status
pm2 list
```

### 2. Check Logs
```bash
pm2 logs iot-gateway --lines 50
```

### 3. Test Health Endpoint
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "mqtt": { "status": "up" }
  }
}
```

### 4. Check Service URLs
```bash
# Main API
curl http://localhost:4000/api

# IoT Logs
curl http://localhost:4000/api/iot-logs/stats
```

### 5. Monitor Resources
```bash
pm2 monit
```

---

## 🔄 Rollback Procedure

If deployment fails:

### 1. Check Git History
```bash
git log --oneline -10
```

### 2. Rollback to Previous Version
```bash
# Find commit hash of previous working version
git checkout <commit-hash>

# Rebuild and restart
npm install
npm run build
pm2 restart iot-gateway
```

### 3. Or Reset to Last Stable Tag
```bash
git tag -l
git checkout <stable-tag>
npm install
npm run build
pm2 restart iot-gateway
```

---

## 🛠️ Troubleshooting

### Script Permission Denied

```bash
chmod +x scripts/*.sh
```

### PM2 Not Found

```bash
npm install -g pm2
```

### Service Won't Start

```bash
# Check logs
pm2 logs iot-gateway

# Check .env file
cat .env

# Test manually
npm run start:prod
```

### Port Already in Use

```bash
# Check what's using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=4001
```

### Git Pull Fails

```bash
# Stash local changes
git stash

# Pull
git pull

# Apply stashed changes (if needed)
git stash pop
```

---

## 📝 Server Setup Requirements

### Prerequisites

1. **Node.js 18+**
```bash
# Install Node.js (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

2. **Git**
```bash
# Install Git (Ubuntu)
sudo apt-get update
sudo apt-get install git

# Configure
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

3. **PostgreSQL** (if not using external DB)
```bash
sudo apt-get install postgresql postgresql-contrib
```

4. **MQTT Broker** (if not using external broker)
```bash
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

---

## 🔐 Security Considerations

### 1. Secure .env File
```bash
chmod 600 .env
chown $USER:$USER .env
```

### 2. Use SSH Keys for Git
```bash
ssh-keygen -t ed25519 -C "your@email.com"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub/GitLab
```

### 3. Setup Firewall
```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 4000  # IoT Gateway (if needed externally)
sudo ufw allow 1883  # MQTT (if needed externally)
sudo ufw enable
```

---

## 📊 Monitoring & Logs

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs iot-gateway

# Tail logs
pm2 logs iot-gateway --lines 100

# Flush logs
pm2 flush
```

### Log Rotation
```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 🚨 Emergency Procedures

### Service Down
```bash
# Quick restart
pm2 restart iot-gateway

# Or full restart
pm2 delete iot-gateway
./scripts/deploy.sh production
```

### Database Connection Lost
```bash
# Check database status
systemctl status postgresql

# Restart database
sudo systemctl restart postgresql

# Restart service
pm2 restart iot-gateway
```

### High Memory Usage
```bash
# Check memory
pm2 monit

# Restart service
pm2 restart iot-gateway

# If persists, check logs
pm2 logs iot-gateway --lines 200
```

---

## 📋 Deployment Checklist

### Before Deployment
- [ ] Check current service status
- [ ] Backup database (if applicable)
- [ ] Review changelog
- [ ] Test in staging (if available)
- [ ] Notify team

### During Deployment
- [ ] Run deployment script
- [ ] Monitor logs for errors
- [ ] Check PM2 status
- [ ] Test health endpoint
- [ ] Verify MQTT connection

### After Deployment
- [ ] Check service metrics
- [ ] Monitor logs for 5-10 minutes
- [ ] Test main features
- [ ] Update documentation
- [ ] Notify team of completion

---

## 🎯 Quick Reference

```bash
# First time setup
./scripts/setup.sh

# Full deployment
./scripts/deploy.sh production

# Quick update
./scripts/quick-deploy.sh

# Check status
pm2 status

# View logs
pm2 logs iot-gateway

# Monitor
pm2 monit

# Restart
pm2 restart iot-gateway

# Stop
pm2 stop iot-gateway

# Health check
curl http://localhost:4000/api/health
```

---

**Last Updated:** November 22, 2025  
**Scripts Location:** `scripts/`  
**PM2 Config:** `ecosystem.config.js`
