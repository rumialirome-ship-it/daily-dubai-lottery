# Daily Dubai Lottery Application

This is a full-stack lottery application with a React frontend and an Express.js backend using a MySQL database. This guide provides instructions for deploying the application to a Virtual Private Server (VPS).

## Deployment to VPS

Follow these steps to get your application running in a production environment on a Linux-based VPS.

### 1. Prerequisites on the VPS

Ensure you have the following software installed on your server.

-   **Git:** For cloning the repository.
-   **Node.js & npm:** (Version 16.x or newer is recommended).
-   **PM2:** A process manager for Node.js to keep your application running.
    ```bash
    sudo npm install pm2 -g
    ```
-   **Nginx:** A web server and reverse proxy.
-   **MySQL Server:** The database for the application.
    ```bash
    sudo apt update
    sudo apt install nginx git mysql-server
    ```

### 2. Set Up MySQL Database

After installing MySQL, you need to create a database and a user for the application. This set of commands will completely reset the user to ensure a clean setup.

```bash
# Log in to MySQL as root. You may need to use 'sudo mysql'
# and enter your root password if one is set.
sudo mysql

# In the MySQL prompt, run the following commands.
# IMPORTANT: Replace 'your_strong_password' with the EXACT password you will use in your .env file.

CREATE DATABASE IF NOT EXISTS mydb;
DROP USER IF EXISTS 'ddl_user'@'localhost';
DROP USER IF EXISTS 'ddl_user'@'127.0.0.1';
CREATE USER 'ddl_user'@'localhost' IDENTIFIED BY 'your_strong_password';
CREATE USER 'ddl_user'@'127.0.0.1' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON mydb.* TO 'ddl_user'@'localhost';
GRANT ALL PRIVILEGES ON mydb.* TO 'ddl_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```
**Note down the database name (`mydb`), username (`ddl_user`), and the password you chose.** You will need them for the `.env` configuration.

#### Verifying Permissions

If the `db:init` script fails with an 'Access denied' error, it's almost always because the database user's permissions are incorrect. You can verify the permissions by logging back into MySQL and running:

```sql
-- Run these in the MySQL prompt
SHOW GRANTS FOR 'ddl_user'@'localhost';
SHOW GRANTS FOR 'ddl_user'@'127.0.0.1';
```

The output for **both** commands **must** include a line that looks like this:
`GRANT ALL PRIVILEGES ON \`mydb\`.* TO \`ddl_user\`@\`...\``

If you do not see `ALL PRIVILEGES`, you must run the `GRANT` commands from the section above again.

### 3. Clone the Repository

Clone your project's source code onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### 4. Build the Frontend

The React frontend needs to be compiled into static files. The build process will also generate the necessary CSS file from Tailwind CSS.

First, install all frontend and development dependencies:
```bash
# From the project's root directory
npm install
```

Next, build the application. You **must** provide your Google Gemini API key as an environment variable during this step.
```bash
# Replace <YOUR_GEMINI_API_KEY> with your actual key
API_KEY=<YOUR_GEMINI_API_KEY> npm run build
```

This command creates a `dist` directory containing the optimized and production-ready frontend application.

#### Troubleshooting the Build

-   **"Gemini API Key is missing" Error:** If you see this error in the browser console after deployment, it means the `API_KEY` was not available during the `npm run build` step. The AI-powered features will be disabled. To fix this, you must re-run the build command on your server, ensuring the `API_KEY` is correctly prefixed as shown above.

### 5. Set Up the Backend

Navigate to the backend directory and install its dependencies.

```bash
cd backend
npm install
```

### 6. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

```bash
# Still inside the 'backend' directory
nano .env
```

Paste the following content into the file, replacing the placeholder values with your actual credentials.
-   **JWT_SECRET:** **MUST** be replaced with a new, long, random secret key.
-   **DB_...:** Use the MySQL credentials you created in Step 2.
-   **API_KEY:** Your Google Gemini API key.

```
PORT=5000
JWT_SECRET=your_super_strong_and_secret_jwt_key_here
API_KEY=<YOUR_GEMINI_API_KEY>

DB_HOST=127.0.0.1
DB_USER=ddl_user
DB_PASSWORD=your_strong_password
DB_DATABASE=mydb
```

Save the file (in `nano`, press `CTRL+X`, then `Y`, then `Enter`).

### 7. Initialize the Database

Run the database initialization script. This will connect to MySQL, create the necessary tables, and seed the default admin user.

```bash
# Still inside the 'backend' directory
npm run db:init
```

### 8. Start the Application with PM2

Go back to the project's root directory and start the application using PM2 with the production environment settings.

```bash
# Go back to the root of your project
cd ..

# Start the application
pm2 start ecosystem.config.js --env production
```

### 9. Configure Nginx and Secure with SSL

Configure Nginx to act as a reverse proxy for your application.

#### A. Basic Nginx Configuration (HTTP)

Create a new Nginx configuration file for your site:
```bash
sudo nano /etc/nginx/sites-available/dubailott.live
```

Paste the following configuration:

```nginx
# /etc/nginx/sites-available/dubailott.live
server {
    listen 80;
    server_name dubailott.live www.dubailott.live;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site, test the configuration, and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/dubailott.live /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### B. Adding SSL with Let's Encrypt (HTTPS)

Install Certbot for Let's Encrypt certificates.
```bash
sudo apt install certbot python3-certbot-nginx
```

Run Certbot to automatically obtain and configure SSL for your domain.
```bash
sudo certbot --nginx -d dubailott.live -d www.dubailott.live
```

Follow the on-screen prompts. Your site is now secure and accessible at `https://dubailott.live`.

### 10. Managing the Application

-   **List running processes:** `pm2 list`
-   **View real-time logs:** `pm2 logs ddl-backend`
-   **Restart the application:** `pm2 restart ddl-backend`
-   **Restart & update environment variables:** `pm2 restart ddl-backend --update-env`
-   **Stop the application:** `pm2 stop ddl-backend`
-   **Save the process list for server reboot:** `pm2 save`
