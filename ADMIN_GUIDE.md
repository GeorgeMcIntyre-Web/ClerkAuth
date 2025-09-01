# NitroAuth Admin Guide

## How to Grant Users Access to Sites

### Quick Steps:

1. **Go to Admin Panel**: Visit `https://nitroauth.com/admin`
2. **Find the User**: Look in the "All Users" table
3. **Click "Manage Access"**: Click the blue "Manage Access" link under Site Access
4. **Use Quick Templates** OR **Select Individual Permissions**
5. **Click "Update Access"**

### Quick Access Templates:

- **🏠 House Atreides Access**: Grants access to houseatreides.space and premium sites
- **📊 Basic Dashboard**: Basic dashboard access only
- **🔓 All Access**: Full access to everything
- **🚫 No Access**: Remove all access

### For House Atreides Specifically:

To grant a user access to `https://www.houseatreides.space/`:

1. Click "Manage Access" for the user
2. Click "🏠 House Atreides Access" button
3. Click "Update Access"

OR manually select:
- ✅ 🏠 House Atreides & Premium Sites
- ✅ 📊 Main Dashboard

### Individual Site Permissions Explained:

- **📊 Main Dashboard**: Basic dashboard access (required for most sites)
- **🏠 House Atreides & Premium Sites**: Access to premium external sites like houseatreides.space
- **📈 Analytics Dashboard**: View site analytics and reports
- **👥 Customer Management**: CRM and customer data access
- **📦 Inventory Management**: Product and inventory systems
- **💰 Billing & Payments**: Financial and billing systems
- **📋 Advanced Reports**: Detailed reporting tools
- **🔧 API Access**: Direct API and developer tools
- **🎧 Support Tools**: Customer support systems

### User Flow After Granting Access:

1. User visits `https://www.houseatreides.space/`
2. They get redirected to NitroAuth for authentication
3. NitroAuth checks their permissions
4. If they have "House Atreides & Premium Sites" permission, they get redirected back with a secure token
5. House Atreides validates the token and grants access

### Testing Access:

To test if a user has proper access:

1. Sign out of NitroAuth
2. Sign in as the test user
3. Go to: `https://nitroauth.com/authorize?site=houseatreides&redirect_url=https://www.houseatreides.space/`
4. You should see either:
   - ✅ "Access Granted" with auto-redirect
   - 🔒 "Access Denied" if no permissions

### Role Hierarchy:

- **SUPER ADMIN**: Access to everything automatically
- **ADMIN**: Access to most sites (except super admin tools)
- **PREMIUM**: Must be granted specific site permissions
- **STANDARD**: Must be granted specific site permissions
- **GUEST**: Limited access, must be granted permissions

### Common Issues:

1. **User shows "Access Denied"**: Check they have the right site permissions
2. **Changes not taking effect**: User may need to sign out and back in
3. **Can't see Admin Panel**: Only ADMIN and SUPER ADMIN roles can access it

### Adding New Sites:

When you want to add a new external site (like another website):

1. The new site should redirect users to: `https://nitroauth.com/authorize?site=SITENAME&redirect_url=CALLBACK_URL`
2. In the admin panel, grant users the appropriate permissions
3. The site permissions map automatically based on the site name or you can modify the mapping in `/app/api/auth/authorize/route.ts`

### Security Notes:

- Tokens expire after 1 hour for security
- All permission changes are logged
- Super Admins can modify any user's permissions
- Regular Admins cannot modify Super Admin permissions