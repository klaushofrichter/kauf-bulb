# Kauf Bulb Controller

A local Node.js server and Vue.js web application for discovering and controlling [Kauf RGBWW Smart Bulbs](https://kaufha.com/) on your home network.

![Kauf Bulb Controller Web App](screenshot.png)

**[Watch Demo Video](demo.webm)** - See the app in action

## About Kauf Bulbs

[Kauf Bulbs](https://kaufha.com/) are ESP-based smart bulbs running [ESPHome](https://esphome.io/) firmware. They offer local control without cloud dependencies, making them ideal for privacy-conscious smart home setups.

- **Kauf Homepage**: https://kaufha.com/
- **GitHub Repository**: https://github.com/KaufHA/kauf-rgbww-bulbs

## Security Notice

**This application is designed for local home network use only.**

- No authentication or authorization is implemented
- No HTTPS/TLS encryption
- Do not expose this server to the internet
- Do not port-forward or host externally
- Keep the server running only within your trusted home network

## Features

### Server
- **Auto-Discovery**: Automatically discovers Kauf Bulbs on your network using mDNS/Bonjour
- **Persistent Storage**: Remembers bulb names and metadata in `bulb-directory.json`
- **REST API**: Full control of bulbs via HTTP endpoints
- **Real-time Status**: Fetches current state (on/off, brightness, color) from bulbs
- **Bulk Operations**: Turn all bulbs on/off with a single command

### Web Application
- **Responsive UI**: Works on desktop and mobile devices
- **Bulb Dashboard**: Visual cards showing each bulb's status
- **Individual Control**: Toggle power, adjust brightness, set colors per bulb
- **Bulk Actions**: Turn all on, turn all off, refresh discovery
- **Settings Modal**: Edit bulb names, view device info (firmware, IP, MAC)
- **Test Mode**: Cycle through red, green, blue to identify bulbs
- **Auto-Refresh**: Periodically updates bulb status

## Installation

### Prerequisites

- Node.js >= 20.19.0
- npm
- Kauf Bulbs on the same network

### Setup

```bash
# Clone the repository
git clone https://github.com/klaushofrichter/kauf-bulb.git
cd kauf-bulb

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at http://localhost:3001

## Usage

### Web Interface

1. Open http://localhost:3001 in your browser
2. The app will automatically discover bulbs on your network
3. Use the control buttons:
   - **Turn All On** - Turns on all discovered bulbs
   - **Turn All Off** - Turns off all discovered bulbs
   - **Refresh Devices** - Re-runs mDNS discovery
   - **Refresh Status** - Updates bulb states
4. Click on a bulb card to open the settings modal:
   - Edit the friendly name
   - Adjust brightness (0-100%)
   - Pick a color using the color picker or RGB inputs
   - Set transition time
   - View device information (IP, MAC, firmware version)

### API Endpoints

All endpoints are prefixed with `/api`.

#### List Bulbs
```
GET /api/list
```
Returns all known bulbs with their current state.

#### Turn On
```
GET /api/on                     # Turn on all bulbs
GET /api/on?device=<id>         # Turn on specific bulb
GET /api/on?transition=2000     # With 2-second transition
```

#### Turn Off
```
GET /api/off                    # Turn off all bulbs
GET /api/off?device=<id>        # Turn off specific bulb
```

#### Refresh Discovery
```
POST /api/refresh
```
Triggers mDNS discovery to find new bulbs.

#### Get Bulb State
```
GET /api/bulb/:id/state
```
Returns the current state of a specific bulb.

#### Get Device Info
```
GET /api/bulb/:id/info
```
Returns firmware version, ESPHome version, and MAC address.

#### Test Bulb
```
POST /api/bulb/:id/test
```
Cycles the bulb through red, green, blue colors for identification.

#### Advanced Control
```
POST /api/bulb/:id/control
Content-Type: application/json

{
  "state": "on",
  "brightness": 75,
  "r": 255,
  "g": 128,
  "b": 0,
  "transition": 1000
}
```

#### Update Bulb Name
```
POST /api/bulb/:id/name
Content-Type: application/json

{
  "name": "Living Room Lamp"
}
```

### API Examples with curl

```bash
# List all bulbs
curl http://localhost:3001/api/list

# Turn on all bulbs
curl http://localhost:3001/api/on

# Turn off all bulbs
curl http://localhost:3001/api/off

# Turn on a specific bulb
curl "http://localhost:3001/api/on?device=kauf-bulb-abc123"

# Turn off a specific bulb
curl "http://localhost:3001/api/off?device=kauf-bulb-abc123"

# Turn on with custom transition (2 seconds)
curl "http://localhost:3001/api/on?device=kauf-bulb-abc123&transition=2000"

# Refresh device discovery
curl -X POST http://localhost:3001/api/refresh

# Get bulb state
curl http://localhost:3001/api/bulb/kauf-bulb-abc123/state

# Get device info (firmware, MAC address)
curl http://localhost:3001/api/bulb/kauf-bulb-abc123/info

# Test bulb (cycles through red, green, blue)
curl -X POST http://localhost:3001/api/bulb/kauf-bulb-abc123/test

# Set brightness to 50% with orange color
curl -X POST http://localhost:3001/api/bulb/kauf-bulb-abc123/control \
  -H "Content-Type: application/json" \
  -d '{"state": "on", "brightness": 50, "r": 255, "g": 128, "b": 0}'

# Set color to blue with 1 second transition
curl -X POST http://localhost:3001/api/bulb/kauf-bulb-abc123/control \
  -H "Content-Type: application/json" \
  -d '{"brightness": 100, "r": 0, "g": 0, "b": 255, "transition": 1000}'

# Turn off with slow fade (3 seconds)
curl -X POST http://localhost:3001/api/bulb/kauf-bulb-abc123/control \
  -H "Content-Type: application/json" \
  -d '{"state": "off", "transition": 3000}'

# Update bulb friendly name
curl -X POST http://localhost:3001/api/bulb/kauf-bulb-abc123/name \
  -H "Content-Type: application/json" \
  -d '{"name": "Living Room Lamp"}'
```

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```
PORT=3001
```

### Bulb Directory

Bulb metadata is stored in `bulb-directory.json`:

```json
[
  {
    "id": "kauf-bulb-abc123",
    "name": "Kitchen Light",
    "lastSeen": "2025-12-13T10:30:00Z",
    "lastIp": "192.168.1.100"
  }
]
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Run production server
npm run test         # Run all tests (unit + E2E)
npm run test:watch   # Run tests in watch mode
npm run test:api     # Run API unit tests only
npm run test:e2e     # Run Playwright E2E tests only
npm run test:e2e:ui  # Run E2E tests with UI
```

### Project Structure

```
kauf-bulb/
├── server/
│   ├── index.js           # Express server entry point
│   ├── discovery.js       # mDNS device discovery
│   ├── bulbController.js  # ESPHome API interactions
│   ├── bulbStore.js       # In-memory store + persistence
│   └── routes/
│       └── api.js         # REST API routes
├── src/
│   ├── App.vue            # Main Vue component
│   ├── main.js            # Vue entry point
│   ├── components/
│   │   ├── BulbList.vue   # Bulb grid with controls
│   │   ├── BulbCard.vue   # Individual bulb card
│   │   └── BulbModal.vue  # Settings modal
│   └── composables/
│       └── useBulbs.js    # API composable
├── tests/
│   ├── api/               # API unit/integration tests
│   └── e2e/               # Playwright E2E tests
├── package.json
├── vite.config.js
└── playwright.config.js
```

### Testing

The project includes comprehensive tests:

- **API Tests**: Unit tests for all endpoints using Vitest + Supertest
- **Integration Tests**: Tests against real bulbs on the network
- **E2E Tests**: Browser tests using Playwright with video recording

```bash
# Run all tests
npm run test

# Run with real bulb integration
npm run test:api:integration
```

## Technical Details

### ESPHome API

Kauf Bulbs expose a REST API via ESPHome:

- `POST /light/light/turn_on?brightness=255&r=255&g=0&b=0&transition=1`
- `POST /light/light/turn_off?transition=1`
- `GET /light/light` - Returns current state

### mDNS Discovery

The server discovers bulbs by browsing for `_esphomelib._tcp` services and filtering for names starting with `kauf-bulb`.

## License

MIT

## Acknowledgments

- [Kauf Smart Home](https://kaufha.com/) for creating excellent ESPHome-based bulbs
- [ESPHome](https://esphome.io/) for the local control firmware
- [Bonjour Service](https://github.com/onlxltd/bonjour-service) for mDNS discovery
