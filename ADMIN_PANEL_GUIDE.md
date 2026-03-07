# 🔐 Admin Panel Setup Guide

## Admin Credentials

Your admin panel has been configured with the following credentials:

```
Email:    bagankhan159@gmail.com
Password: admin@123
```

---

## 🚀 Accessing the Admin Panel

### From the Homepage
1. Navigate to your application homepage
2. Go to `/admin` or `/admin-login`
3. You'll be redirected to the login page if not already logged in

### Direct Login URL
```
http://localhost:5173/admin-login
```

---

## 📋 Admin Panel Features

The admin panel includes access to:

### 📊 Overview
- **Dashboard** - Overview of key metrics and statistics

### 🛍️ Sales & Orders
- **Orders** - View and manage customer orders
- **Payments** - Track payment information

### 📦 Inventory
- **Products** - Manage product listings
- **Spare Parts** - Manage spare parts inventory
- **Parts Config** - Configure spare parts settings
- **Shop Inventory** - Manage shop stock levels
- **Categories** - Organize product categories

### 🔧 Services
- **Repairs** - View and manage repair tickets
- **Part Requests** - Handle customer part requests
- **Technicians** - Manage technician assignments

### ⚙️ Configuration
- **Settings** - Configure system settings

---

## 🔑 Login Process

### Step 1: Navigate to Login
Go to `http://localhost:5173/admin-login`

### Step 2: Enter Credentials
- **Email:** `bagankhan159@gmail.com`
- **Password:** `admin@123`

### Step 3: Submit
Click "Login to Admin Panel" button

### Step 4: Access Dashboard
You'll be redirected to `/admin` on successful login

---

## 🛡️ Security Features

### Session Management
- Admin sessions are stored in browser's localStorage
- Session includes:
  - Email address
  - Unique token
  - Login timestamp

### Session Expiration
- Sessions remain valid for **24 hours**
- After 24 hours, you'll need to log in again
- All admin routes require valid session

### Protected Routes
- All `/admin/*` routes require authentication
- Accessing protected routes without login redirects to `/admin-login`
- Logging out clears the session immediately

---

## 🚪 Logout

### Method 1: Logout Button (Desktop)
- Top-right corner of admin panel
- Click "Logout" button

### Method 2: Logout Button (Mobile)
- Menu → Logout option
- (Or use the full-screen menu)

### Logout Behavior
- Session is cleared from localStorage
- Redirects to `/admin-login`
- Success message:"Logged out successfully"

---

## 📧 Session Storage

Admin session information is stored as:
```json
{
  "email": "bagankhan159@gmail.com",
  "token": "admin_1708346400_a1b2c3d",
  "loginTime": "2026-02-18T10:00:00.000Z"
}
```

**Storage Location:** Browser's localStorage under key `admin_session`

---

## ⚙️ Configuration Details

### Admin Email
- **Email:** `bagankhan159@gmail.com`
- **Type:** Hardcoded (for security purposes)
- **Managed in:** `src/pages/AdminLogin.tsx`

### Admin Password
- **Password:** `admin@123`
- **Type:** Hardcoded (for security purposes)  
- **Managed in:** `src/pages/AdminLogin.tsx`

### Protected Route Component
- **Component:** `AdminProtectedRoute`
- **Location:** `src/components/AdminProtectedRoute.tsx`
- **Function:** Validates session before allowing access to admin panel

---

## 🔄 Login Flow Diagram

```
┌──────────────────┐
│ Visit /admin     │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────┐
│ Check localStorage for       │
│ admin_session               │
└────────┬──────────────────┬─┘
         │                  │
      Yes│                  │No
         │                  │
         ▼                  ▼
    ┌────────────┐    ┌──────────────┐
    │Show Admin  │    │Redirect to   │
    │Panel       │    │/admin-login  │
    └────────────┘    └──────┬───────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │Display Login    │
                    │Form             │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │Validate         │
                    │Credentials      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
           Valid          Invalid      Error
              │              │              │
              ▼              ▼              ▼
    ┌──────────────┐  ┌────────────┐  ┌───────┐
    │Store Session │  │Show Error  │  │Toast  │
    │in localStorage   │Message     │  │Error  │
    └──────┬───────┘  └────────────┘  └───────┘
           │
           ▼
    ┌────────────────┐
    │Redirect to     │
    │/admin          │
    └────────────────┘
```

---

## 🆘 Troubleshooting

### Issue: "Invalid email or password"
**Solution:** 
- Double-check email is: `bagankhan159@gmail.com`
- Double-check password is: `admin@123`
- Check for extra spaces or typos

### Issue: Can't access admin panel
**Solution:**
- Ensure you're logged in (session valid)
- Clear browser cache
- Check localStorage has `admin_session`
- Try logging out and back in

### Issue: Session expired
**Solution:**
- Sessions expire after 24 hours
- Log in again with admin credentials
- Session time is checked every time you access admin

### Issue: Logout button not working
**Solution:**
- Refresh page
- Clear localStorage manually
- Use browser DevTools to remove `admin_session` key

---

## 🔐 Changing Admin Credentials (For Developers)

To change admin credentials, edit `src/pages/AdminLogin.tsx`:

```typescript
// Find this section:
const ADMIN_EMAIL = "bagankhan159@gmail.com";
const ADMIN_PASSWORD = "admin@123";

// Change to your desired credentials:
const ADMIN_EMAIL = "newemail@example.com";
const ADMIN_PASSWORD = "newpassword123";
```

Then redeploy the application.

---

## 📝 Production Recommendations

⚠️ **Important for Production:**

1. **Do not hardcode credentials** in production
   - Use environment variables
   - Use Supabase Auth with admin roles
   - Implement real authentication

2. **Use HTTPS only** in production
   - Never send credentials over HTTP

3. **Implement rate limiting**
   - Prevent brute force attacks

4. **Add 2FA (Two-Factor Authentication)**
   - SMS or email verification

5. **Audit logging**
   - Log all admin actions
   - Monitor suspicious activity

6. **Regular credential rotation**
   - Change password every 90 days

7. **Secure storage**
   - Use encrypted environment variables
   - Never expose in frontend code

---

## 🎯 Quick Commands

### Go to Admin Login
```
http://localhost:5173/admin-login
```

### Go to Admin Dashboard (if logged in)
```
http://localhost:5173/admin
```

### Clear Admin Session (DevTools Console)
```javascript
localStorage.removeItem("admin_session");
```

### Check Admin Session (DevTools Console)
```javascript
console.log(JSON.parse(localStorage.getItem("admin_session")));
```

---

## 📞 Support

For issues with the admin panel:
1. Check browser console for errors
2. Verify session in localStorage
3. Check network requests in DevTools
4. Review console logs for detailed error messages

---

## ✅ Next Steps

1. ✓ Admin panel created with credentials
2. ✓ Admin login page built
3. ✓ Session management implemented
4. ✓ Protected routes configured
5. ⭐ Start building admin features!

---

**Admin Panel URL:** `http://localhost:5173/admin-login`

**Credentials:**
- Email: `bagankhan159@gmail.com`
- Password: `admin@123`

Happy administrating! 🚀
