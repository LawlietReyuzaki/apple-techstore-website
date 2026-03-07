# Admin Panel Quick Reference

## 🔐 Login Credentials

```
Email:    bagankhan159@gmail.com
Password: admin@123
```

## 🚀 Access URLs

| Action | URL |
|--------|-----|
| Admin Login | `http://localhost:5173/admin-login` |
| Admin Dashboard | `http://localhost:5173/admin` |
| Dashboard (if logged in) | Direct link in navigation |

## 📊 Admin Panel Sections

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/admin` | View overview & stats |
| Orders | `/admin/orders` | Manage customer orders |
| Payments | `/admin/payments` | Track payments |
| Products | `/admin/products` | Manage products |
| Spare Parts | `/admin/spare-parts` | Manage spare parts |
| Parts Config | `/admin/spare-parts-config` | Configure parts |
| Shop Inventory | `/admin/shop-inventory` | Manage stock |
| Categories | `/admin/categories` | Organize categories |
| Repairs | `/admin/repairs` | Manage repair tickets |
| Part Requests | `/admin/part-requests` | Handle requests |
| Technicians | `/admin/technicians` | Manage technicians |
| Settings | `/admin/settings` | System settings |

## 🔑 Session Info

```javascript
// Check if logged in (DevTools Console)
const session = JSON.parse(localStorage.getItem("admin_session"));
console.log(session);
```

**Output:**
```json
{
  "email": "bagankhan159@gmail.com",
  "token": "admin_1708346400_a1b2c3d",
  "loginTime": "2026-02-18T10:00:00.000Z"
}
```

## 🚪 Logout

Click **"Logout"** button in top-right corner of admin panel

## ⏱️ Session Timeout

- **Duration:** 24 hours
- **After timeout:** Auto-redirect to login
- **Logout clears:** Immediate session removal

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/pages/AdminLogin.tsx` | Login page & credentials |
| `src/components/AdminProtectedRoute.tsx` | Route protection |
| `src/pages/admin/AdminLayout.tsx` | Admin layout & navigation |
| `src/App.tsx` | Routes configuration |

## 🔐 Credentials Location

**File:** `src/pages/AdminLogin.tsx`

**Lines:** ~26-27
```typescript
const ADMIN_EMAIL = "bagankhan159@gmail.com";
const ADMIN_PASSWORD = "admin@123";
```

## ✅ Setup Checklist

- ✓ AdminLogin page created
- ✓ Credentials configured
- ✓ AdminProtectedRoute created
- ✓ Routes protected in App.tsx
- ✓ Logout functionality added
- ✓ Session management implemented

## 🎯 First Time Setup

1. Start dev server: `npm run dev`
2. Go to `http://localhost:5173/admin-login`
3. Enter admin credentials above
4. Click "Login to Admin Panel"
5. You're in! 🎉

## 🔄 Typical Admin Workflow

```
1. Visit http://localhost:5173/admin-login
   ↓
2. Enter email & password
   ↓
3. Click login button
   ↓
4. Redirected to /admin dashboard
   ↓
5. Use navigation to access different sections
   ↓
6. Click logout to end session
```

## 📱 Mobile Access

- Same credentials on mobile
- Responsive design works on all devices
- Menu collapses on smaller screens
- Touch-friendly buttons

## 🐛 Debug Commands

```javascript
// Check session exists
localStorage.getItem("admin_session") ? "Logged in" : "Not logged in"

// View full session
console.log(JSON.parse(localStorage.getItem("admin_session")))

// Clear session
localStorage.removeItem("admin_session"); location.reload()

// Check session age
const session = JSON.parse(localStorage.getItem("admin_session"));
const age = (Date.now() - new Date(session.loginTime).getTime()) / 1000 / 60;
console.log(`Session age: ${age} minutes`)
```

## 🚨 Common Issues

| Issue | Fix |
|-------|-----|
| Wrong password | Use `admin@123` |
| Wrong email | Use `bagankhan159@gmail.com` |
| Already logged in | Clear localStorage & reload |
| Session expired | Log in again |
| Can't find logout | It's in top-right corner |

## 💡 Notes

- Credentials are **hardcoded** for development
- Sessions stored in **localStorage**
- Auto-logout after **24 hours**
- Use for **admin access only**
- Not for regular users

## 📞 Need Help?

See: `ADMIN_PANEL_GUIDE.md` for detailed information
