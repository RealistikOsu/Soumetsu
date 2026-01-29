# Soumetsu - RealistikOsu! Frontend

<div align="center">

**A modern, feature-rich web frontend for custom osu! servers**

[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go)](https://golang.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-green.svg?style=flat-square)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Development](#-development)

</div>

---

## 🌟 About

**Soumetsu** is the official web frontend for [RealistikOsu!](https://ussr.pl/), a custom server for the popular rhythm game osu!. Built with modern web technologies and a focus on user experience, Soumetsu provides a beautiful, responsive interface for players to interact with the server.

Originally based on [hanayo](https://github.com/osuripple/hanayo), Soumetsu has evolved into a fully-featured web application that powers one of the most active custom osu! communities. With a clean, modern design and extensive customization options, it's the perfect foundation for your own osu! server.

### Why Choose Soumetsu?

- 🎨 **Modern UI/UX** - Beautiful, responsive design built with Tailwind CSS
- ⚡ **High Performance** - Fast, efficient Go backend with optimised templates
- 🔧 **Highly Customisable** - Easy to modify and extend for your needs
- 🌐 **Feature Complete** - Everything you need for a thriving osu! community
- 📱 **Mobile Friendly** - Works seamlessly on all devices
- 🔒 **Secure** - Built with security best practices in mind

---

## ✨ Features

Soumetsu comes packed with all the features you'd expect from a modern osu! server frontend:

### Core Features
- 👤 **User Profiles** - Comprehensive user profiles with statistics, achievements, and customization
- 🎵 **Beatmap System** - Browse, search, and download beatmaps with ranking support
- 🏆 **Leaderboards** - Global and country-specific leaderboards for all game modes
- 👥 **Clan System** - Create and manage clans with member management and boards
- 📊 **Statistics** - Detailed performance tracking and analytics
- 💬 **Community Features** - User interactions, comments, and social features

### Game Mode Support
- 🎯 **osu!standard** - Full support for standard mode
- 🥁 **osu!taiko** - Taiko mode leaderboards and statistics
- 🍎 **osu!catch** - Catch the Beat mode support
- ⌨️ **osu!mania** - Mania mode rankings and features

### Additional Features
- 🔐 **Authentication** - Secure login and registration system
- 📧 **Email Integration** - Password reset and notifications via Mailgun
- 🤖 **Discord Integration** - Connect with Discord for authentication and features
- 🛡️ **Security** - reCAPTCHA support and IP-based security features

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Go** 1.21 or higher ([Download](https://golang.org/dl/))
- **Node.js** 16+ and npm ([Download](https://nodejs.org/))
- **MySQL** 5.7+ or MariaDB 10.3+
- **Redis** 6.0+
- **Make** (optional, for Docker builds)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RealistikOsu/soumetsu.git
   cd soumetsu
   ```

2. **Install Go dependencies**
   ```bash
   go mod download
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Build frontend assets**
   ```bash
   npm run tailwind:build
   # Or use the build script
   ./build.sh
   ```

5. **Configure the application**
   ```bash
   cp env.example .env
   # Edit .env with your configuration (see Configuration section)
   ```

6. **Run the application**
   ```bash
   go run ./cmd/soumetsu
   ```

The application will be available at `http://localhost:8080` (or your configured port).

---

## 🛠️ Development

### Docker Support

Soumetsu includes Docker support for easy deployment:

```bash
# Build Docker image
make build
# or
docker build -t soumetsu:latest .

# Run with Docker
make run
# or
docker run --network=host --env-file=.env soumetsu:latest
```

### Project Structure

```
soumetsu/
├── cmd/
│   └── soumetsu/          # Main application entry point
├── internal/              # Internal Go packages
│   ├── api/              # API handlers
│   ├── config/          # Configuration management
│   └── models/          # Data models
├── web/
│   ├── static/          # Static assets (CSS, JS, images)
│   └── templates/       # HTML templates
├── data/                # Data files (YAML, JSON)
└── scripts/             # Build and utility scripts
```

### Available Scripts

- `npm run tailwind:watch` - Watch and rebuild Tailwind CSS on changes
- `npm run tailwind:build` - Build Tailwind CSS for production
- `npm run dev` - Alias for `tailwind:watch`
- `./build.sh` - Full build script (installs deps, builds CSS and JS)

---

## 📚 Additional Resources

- **RealistikOsu! Website**: [https://ussr.pl/](https://ussr.pl/)
- **GitHub Organization**: [https://github.com/RealistikOsu](https://github.com/RealistikOsu)
- **Original hanayo**: [https://github.com/osuripple/hanayo](https://github.com/osuripple/hanayo)


---

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

The AGPL-3.0 license ensures that any modifications to this software, when run on a network server, must be made available to users of that server.

---

<div align="center">

**Ready to build your own osu! server? Get started with Soumetsu today!**

[⬆ Back to Top](#soumetsu---realistikosu-frontend)

</div>
