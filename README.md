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
-   **Nginx:** A web server and reverse proxy.
    ```bash
    sudo apt update
    sudo apt install nginx
    ```

### 2. Clone the Repository

Clone your project's source code onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### 3. Build the Frontend

The React frontend needs to be compiled into static HTML, CSS, and JavaScript files. Before running the build, you must make the Gemini API key available as an environment variable.

```bash
# Install all frontend dependencies
npm install

# Run the build script, providing your API key
# You can get your key from Google AI Studio
API_KEY=<YOUR_GEMINI_API_KEY> npm run build
```

This command will create a `dist` directory in your project root, containing the optimized frontend application with the API key embedded.

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

Paste the following content into the file.
-   **JWT_SECRET:** You **must** replace this with a new, long, and random secret key. You can use an online generator to create a strong key.
-   **API_KEY:** This is your Google Gemini API key, the same one you used for the frontend build.

```
PORT=5000
JWT_SECRET=your_super_strong_and_secret_jwt_key_here
API_KEY=<YOUR_GEMINI_API_KEY>
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

Your application is now running! However, it's only accessible directly via port 5000. The next step is to configure Nginx to make it accessible through your domain.

### 8. Configure Nginx and Secure with SSL

For a production environment on `dubailott.live`, it's essential to run your app behind Nginx as a reverse proxy.

#### A. Basic Nginx Configuration (HTTP)

Create a new Nginx configuration file for your site:
```bash
sudo nano /etc/nginx/sites-available/dubailott.live
```

Paste the following configuration, which forwards requests to your application running on port 5000.

```nginx
# /etc/nginx/sites-available/dubailott.live
server {
    listen 80;
    server_name dubailott.live www.dubailott.live;

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

Enable the site by creating a symbolic link:
```bash
sudo ln -s /etc/nginx/sites-available/dubailott.live /etc/nginx/sites-enabled/
```

Test the Nginx configuration and restart the service:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

At this point, you should be able to access your site at `http://dubailott.live`.

#### B. Adding SSL with Let's Encrypt (HTTPS)

First, install Certbot, the tool for obtaining SSL certificates from Let's Encrypt.
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Now, run Certbot. It will automatically detect your `dubailott.live` configuration, obtain a certificate, and update your Nginx file to handle HTTPS and redirect HTTP traffic.

```bash
sudo certbot --nginx -d dubailott.live -d www.dubailott.live
```

Follow the on-screen prompts. Certbot will handle the rest. Your site will now be secure and accessible at `https://dubailott.live`.

### 9. Managing the Application

Here are some useful PM2 commands:

-   **List running processes:** `pm2 list`
-   **View real-time logs:** `pm2 logs ddl-backend`
-   **Restart the application:** `pm2 restart ddl-backend`
-   **Stop the application:** `pm2 stop ddl-backend`
-   **Save the process list to restart on server reboot:** `pm2 save`
