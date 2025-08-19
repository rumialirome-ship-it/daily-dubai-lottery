# Daily Dubai Lottery Application

This is a full-stack lottery application with a React frontend and an Express.js backend. This guide provides instructions for deploying the application to a Virtual Private Server (VPS).

## Deployment to VPS

Follow these steps to get your application running in a production environment on a Linux-based VPS.

### 1. Prerequisites on the VPS

Ensure you have the following software installed on your server.

-   **Git:** For cloning the repository.
-   **Node.js & npm:** (Version 16.x or newer is recommended).
-   **PM2:** A process manager for Node.js to keep your application running.
    ```bash
    npm install pm2 -g
    ```

### 2. Clone the Repository

Clone your project's source code onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### 3. Build the Frontend

The React frontend needs to be compiled into static HTML, CSS, and JavaScript files.

```bash
# Install all frontend dependencies
npm install

# Run the build script
npm run build
```

This will create a `dist` directory in your project root, containing the optimized frontend application.

### 4. Set Up the Backend

Navigate to the backend directory and install its dependencies.

```bash
cd backend
npm install
```

### 5. Configure Environment Variables

Create a `.env` file inside the `backend` directory. This file stores sensitive configuration details.

```bash
# Still inside the 'backend' directory
nano .env
```

Paste the following content into the file. **You must replace the JWT_SECRET with a new, long, and random secret key.** You can generate one online.

```
PORT=5000
JWT_SECRET=your_super_strong_and_secret_jwt_key_here
```

Save the file (in `nano`, press `CTRL+X`, then `Y`, then `Enter`).

### 6. Initialize the Database

Run the database initialization script. This will create the `lottery.db` file and set up the necessary tables and the default admin user.

```bash
# Still inside the 'backend' directory
npm run db:init
```

### 7. Start the Application with PM2

Now, go back to the project's root directory and start the application using PM2 with the production environment settings from your `ecosystem.config.js` file.

```bash
# Go back to the root of your project
cd ..

# Start the application
pm2 start ecosystem.config.js --env production
```

Your application is now running! The backend server is serving both the API and the static frontend files on the port you specified (e.g., `http://YOUR_VPS_IP:5000`).

### 8. Managing the Application

Here are some useful PM2 commands:

-   **List running processes:** `pm2 list`
-   **View real-time logs:** `pm2 logs ddl-backend`
-   **Restart the application:** `pm2 restart ddl-backend`
-   **Stop the application:** `pm2 stop ddl-backend`
-   **Save the process list to restart on server reboot:** `pm2 save`

---

## (Recommended) Using a Reverse Proxy (Nginx)

For a production environment, it is highly recommended to run your app behind a reverse proxy like Nginx. This allows you to:

-   Use a custom domain name (e.g., `www.your-lottery-app.com`).
-   Easily set up SSL/TLS with Let's Encrypt for a secure `https://` connection.
-   Improve performance and security.

A basic Nginx configuration would forward requests from port 80 (HTTP) to your application's port (5000).
```
# Example Nginx server block in /etc/nginx/sites-available/your-domain
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
