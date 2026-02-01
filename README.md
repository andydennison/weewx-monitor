# Home Temperature Monitor

A beautiful, modern Progressive Web App (PWA) for monitoring WeeWX temperature sensors on your Raspberry Pi. Perfect for monitoring multiple rooms in your home with threshold alerts sent directly to your iOS or Android device.

## Features

- **Real-time Dashboard**: View current temperatures from all sensors at a glance
- **Floor Differential**: See the temperature difference between upstairs and downstairs
- **Historical Trends**: Interactive charts showing temperature history (6h, 12h, 24h, 7d, 30d)
- **Threshold Alerts**: Get notified when temperatures go above or below your set thresholds
- **PWA Support**: Install on your iPhone or Android as a native-like app
- **Offline Support**: Works even when your connection is spotty
- **Dark Theme**: Easy on the eyes, especially at night

## Screenshots

The app displays a modern, dark-themed interface with:
- Large, easy-to-read temperature cards for each sensor
- Color-coded alerts (blue for cold, orange for hot)
- Interactive trend charts
- Configurable threshold settings

## Requirements

- Raspberry Pi with WeeWX installed and collecting data
- PHP 7.4+ with SQLite3 extension
- Apache or Nginx web server
- Optional: PHP GD extension for icon generation

## Installation

### 1. Clone the Repository

```bash
cd /var/www/html
git clone https://github.com/yourusername/weewx-monitor.git
cd weewx-monitor
```

### 2. Configure the Sensor Mapping

Edit `config/sensors.json` to match your WeeWX sensor configuration:

```json
{
    "database_path": "/var/lib/weewx/weewx.sdb",
    "home_name": "Your Home Name",
    "sensors": [
        {
            "id": "kitchen",
            "name": "Kitchen",
            "icon": "kitchen",
            "temp_field": "inTemp",
            "humidity_field": "inHumidity",
            "location": "downstairs",
            "thresholds": {
                "temp_min": 62,
                "temp_max": 78,
                "humidity_min": 30,
                "humidity_max": 60
            }
        }
    ]
}
```

### 3. Set Permissions

```bash
# Make config directory writable for threshold updates
sudo chown -R www-data:www-data config/
sudo chmod -R 755 config/

# Ensure WeeWX database is readable
sudo usermod -a -G weewx www-data
```

### 4. Generate Icons (Optional)

```bash
# Using PHP GD (recommended for Raspberry Pi)
php scripts/bootstrap-icons.php

# Or using ImageMagick/Inkscape
chmod +x scripts/generate-icons.sh
./scripts/generate-icons.sh
```

### 5. Configure Apache

Create a virtual host or add to your existing configuration:

```apache
<VirtualHost *:80>
    ServerName your-pi.local
    DocumentRoot /var/www/html/weewx-monitor/public

    <Directory /var/www/html/weewx-monitor/public>
        AllowOverride All
        Require all granted
    </Directory>

    # Alias for API
    Alias /api /var/www/html/weewx-monitor/api
    <Directory /var/www/html/weewx-monitor/api>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Enable required modules and restart Apache:

```bash
sudo a2enmod rewrite expires deflate headers
sudo systemctl restart apache2
```

### 6. Alternative: Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-pi.local;
    root /var/www/html/weewx-monitor/public;
    index index.html;

    # API endpoints
    location /api/ {
        alias /var/www/html/weewx-monitor/api/;
        try_files $uri $uri/ =404;
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }

    # PWA routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|png|svg|ico)$ {
        expires 1w;
        add_header Cache-Control "public, immutable";
    }
}
```

## Installing on iOS

1. Open Safari and navigate to your Raspberry Pi's address
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. Open the app from your home screen
6. Enable notifications when prompted for temperature alerts

## Installing on Android

1. Open Chrome and navigate to your Raspberry Pi's address
2. Tap the menu (three dots)
3. Tap "Add to Home screen" or "Install app"
4. Confirm the installation
5. Enable notifications for temperature alerts

## Enabling Notifications

For notifications to work properly:

1. **iOS 16.4+**: PWA push notifications are supported. Enable in Settings after adding to home screen.
2. **Android**: Notifications work out of the box with the PWA.
3. **Desktop**: Allow notifications when prompted in the browser.

Note: For true push notifications (when the app is closed), you would need to set up a VAPID key server. The current implementation uses polling when the app is open.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sensors.php` | GET | Get current sensor readings and alerts |
| `/api/history.php?range=24h` | GET | Get historical data (6h, 12h, 24h, 7d, 30d) |
| `/api/thresholds.php` | GET | Get current threshold settings |
| `/api/thresholds.php` | POST | Update threshold settings |
| `/api/subscribe.php` | POST | Subscribe to push notifications |

## Customization

### Adding More Sensors

Edit `config/sensors.json` to add more sensors. WeeWX supports `extraTemp1` through `extraTemp7` and corresponding humidity fields.

### Changing Colors

Edit `public/css/style.css` and modify the CSS variables at the top:

```css
:root {
    --color-accent: #4a90d9;
    --color-success: #4ade80;
    --color-cold: #38bdf8;
    --color-hot: #fb923c;
}
```

### Chart Colors

Edit `public/js/charts.js` and modify the `colors` object to change sensor colors on charts.

## Troubleshooting

### "Database not found" error

- Verify the path in `config/sensors.json` matches your WeeWX installation
- Default path is `/var/lib/weewx/weewx.sdb`
- Check permissions: `ls -la /var/lib/weewx/weewx.sdb`

### No data showing

- Ensure WeeWX is running: `sudo systemctl status weewx`
- Check that your sensor field names match what's in the WeeWX database
- Query the database directly: `sqlite3 /var/lib/weewx/weewx.sdb "SELECT * FROM archive ORDER BY dateTime DESC LIMIT 5;"`

### Icons not showing

- Run the icon generator: `php scripts/bootstrap-icons.php`
- Or access `/icons/generate.php?size=192` to generate dynamically

### Notifications not working

- Ensure you're accessing the site over HTTPS or localhost
- Check that notifications are enabled in your device settings
- PWAs require a secure context for push notifications

## Future Enhancements

- [ ] Nest thermostat integration
- [ ] Smart thermostat control based on sensor readings
- [ ] Multiple location support
- [ ] Energy usage tracking
- [ ] Weather forecast integration
- [ ] True push notifications with VAPID keys

## License

MIT License - Feel free to use and modify for your home automation needs!

## Contributing

Contributions welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.
