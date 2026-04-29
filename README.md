# 🚚 Route Optimizer for Food Delivery

A real-time delivery route optimization web app built for Bengaluru's food delivery ecosystem. It clusters orders intelligently, assigns the nearest available riders, animates live delivery simulation on an interactive map, and tracks per-order status from **Pending → En Route → Delivered**.

---

## ✨ Features

### 🗺️ Smart Route Optimization
- Clusters orders into **4 route types** based on pickup/dropoff proximity:
  - `1→1` One to One — single order, single rider
  - `1→N` One to Many — one restaurant, multiple customers
  - `N→1` Many to One — multiple restaurants, one customer
  - `N→N` Many to Many — nearby restaurants and customers grouped together
- Assigns the **nearest available rider** to each cluster using Haversine distance + load balancing
- Draws real road routes using the **OSRM routing engine**

### 📦 Order Management
- Pre-loaded with dummy orders across Bengaluru restaurants
- **Quick Pick** mode — select from 20 restaurants and 12 customers instantly
- **Search Address** mode — search any Bengaluru address via Nominatim geocoding
- Add / delete orders dynamically before optimizing

### 🚴 Live Delivery Simulation
- Riders animate along real road geometry on the map
- Per-order status updates **independently** as each rider reaches each restaurant and customer
- Status flow: `Pending` → `En Route` (at pickup) → `Delivered` (at dropoff)
- ETA countdown timer per route
- Progress bar per route card
- "All deliveries complete" banner when every order is delivered

### 🗺️ Interactive Map
- **Click any route card** to highlight that route on the map and zoom in — other routes dim
- Click the same card again to zoom back out to all routes
- Built on **Leaflet.js** with OpenStreetMap tiles
- Color-coded route lines by type with a legend

### ⚡ Real-time Connection
- WebSocket connection via **Socket.IO** — live status indicator in the header

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JS |
| Map | Leaflet.js + OpenStreetMap |
| Routing | OSRM (Open Source Routing Machine) |
| Geocoding | Nominatim |
| Backend | Node.js + Express |
| Real-time | Socket.IO |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/ZaibaSuzain/Route-Optimizer-For-Food-Delivery.git

# Navigate into the project
cd Route-Optimizer-For-Food-Delivery

# Install dependencies
npm install
```

### Running the App

```bash
# Start the backend server
node backend/server.js
```

Then open your browser and go to:
```
http://localhost:5500/frontend/index.html
```

---

## 📁 Project Structure

```
Route-Optimizer-For-Food-Delivery/
├── backend/
│   └── server.js          # Express server, route optimization logic, Socket.IO
├── frontend/
│   └── index.html         # Full frontend — map, sidebar, simulation, UI
├── package.json
└── README.md
```

---

## 🗺️ How It Works

1. **Add Orders** — pick a restaurant and customer, or search any address in Bengaluru
2. **Optimize Routes** — the backend clusters orders and assigns the nearest riders
3. **Simulate** — watch riders move along real roads on the map
4. **Track** — each order's status updates live as the rider reaches pickup and dropoff points

---

## 📍 Coverage Area

Currently configured for **Bengaluru, India** with 20 preset restaurants across areas like Koramangala, Indiranagar, HSR Layout, Malleshwaram, and more.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).