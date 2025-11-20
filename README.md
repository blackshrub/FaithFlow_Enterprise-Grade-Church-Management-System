# FaithFlow - Church Management System

## 🎯 Overview

FaithFlow is an enterprise-grade, multi-tenant church management system designed for modern churches. It combines comprehensive admin tools with a public-facing kiosk system for visitor and member self-service.

## ✨ Key Features

### **Member Management**
- Complete CRUD with advanced filtering
- Import/Export (Excel, CSV)
- Photo management with base64 storage
- QR code generation for check-in
- Automated status updates with rule engine
- Soft delete with trash bin (14-day retention)
- Demographics tracking
- Document management

### **Events & Worship**
- Event creation and management
- RSVP system with seat assignments
- QR code ticketing
- Event check-in (web + kiosk)
- Seat layout designer
- Photo uploads for events
- Calendar view (list + grid)
- Attendance tracking

### **Spiritual Care**
- Prayer request management
- Counseling appointment system
  - Counselor profiles
  - Recurring availability rules
  - Time slot generation
  - Appointment workflows (pending → approved → completed)
  - Calendar view

### **Groups & Community**
- Small group management
- Group categories (Cell, Ministry, Activity, Support)
- Member management
- Join/Leave request workflows
- Group directory

### **Content & Communication**
- Devotional management
- Article publishing system
  - Categories and tags
  - Comment moderation
  - Scheduled publishing
  - Preview links
- WhatsApp notifications

### **Finance**
- Full accounting system (Chart of Accounts, Journals, Budgets)
- Fixed assets management
- Bank reconciliation
- Fiscal periods
- Responsibility centers
- Reports and year-end closing
- Audit logs

### **Public Kiosk System** 🆕
- Full-screen public interface
- Event registration
- Prayer request submission
- Counseling appointment booking
- Group join requests
- Member profile updates
- Staff event check-in (PIN-protected)
- Multi-tenant church selector
- Phone + OTP authentication via WhatsApp
- Auto Pre-Visitor creation
- Inactivity timeout
- Multi-language (EN + ID)
- Framer Motion animations

### **Admin Features**
- Multi-tenant with church_id scoping
- Role-based access (Super Admin, Admin, Staff)
- JWT authentication
- Webhook system
- API key management
- Import/Export tools
- Comprehensive settings
- Audit trails

## 🏗️ Tech Stack

### **Backend**
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Authentication:** JWT
- **Scheduler:** APScheduler
- **Process Manager:** Supervisor

### **Frontend**
- **Framework:** React + Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** TanStack React Query
- **Routing:** React Router v6
- **Animations:** Framer Motion
- **i18n:** react-i18next (English + Indonesian)
- **Forms:** React Hook Form
- **Icons:** Lucide React

### **Infrastructure**
- **Deployment:** Kubernetes (Emergent platform)
- **Build:** Kaniko
- **Process Management:** Supervisord
- **Database:** MongoDB Atlas (production) / Local MongoDB (development)

## 🌍 Multi-Language Support

- **English (en)**
- **Bahasa Indonesia (id)**
- All UI elements translated
- Admin and kiosk interfaces
- 2000+ translation keys

## 🔐 Security Features

- JWT-based authentication
- Role-based access control
- API key system for external integrations
- 6-digit PIN for staff kiosk access
- OTP verification via WhatsApp (4-digit)
- Multi-tenant data isolation
- Audit logging for all actions
- Webhook signature verification

## 📊 Architecture

### **Multi-Tenant Design**
- All data scoped by `church_id`
- Complete data isolation
- Church selector for public kiosk
- Separate settings per church

### **API-First**
- RESTful API design
- OpenAPI/Swagger documentation
- Public and protected endpoints
- Ready for mobile app integration

### **Modular Structure**
```
/app/
├── backend/
│   ├── models/          # Pydantic models
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── server.py        # FastAPI app
└── frontend/
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── hooks/       # Custom hooks
    │   ├── services/    # API services
    │   └── i18n/        # Translations
    └── public/
```

## 📱 Mobile App Ready

- Public API endpoints for mobile
- Member authentication ready
- RESTful API design
- JSON responses
- Ready for React Native integration

## 🚀 Getting Started

See [INSTALLATION.md](INSTALLATION.md) for detailed setup instructions.

## 📖 Documentation

- [Installation Guide](INSTALLATION.md) - Fresh Debian 12 installation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Configuration Guide](CONFIGURATION.md) - System configuration
- [Kiosk Setup](KIOSK_SETUP.md) - Public kiosk deployment
- [API Documentation](API.md) - API endpoints reference
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

## 👥 Team

Built with ❤️ for churches worldwide

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For support, please contact your administrator.
