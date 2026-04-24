// 1. IMPORTS FIRST
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// 2. CREATE APP
const app = express();
const server = http.createServer(app);

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// 4. SOCKET
const io = new Server(server, { cors: { origin: "*" } });
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
});

// 5. ROUTES (app.post goes HERE — after app is created)
app.post('/api/orders', (req, res) => {
  const { orders, deliveryPersons } = req.body;
  if (!orders.length || !deliveryPersons.length) return res.json([]);

  const kmDist = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const REST_CLUSTER_KM = 5;
  const CUST_CLUSTER_KM = 5;
  const MAX_PER_RIDER = Math.ceil(orders.length / deliveryPersons.length);

  console.log('\n========= DEBUG =========');
  console.log(`Orders: ${orders.length}, Riders: ${deliveryPersons.length}, MAX_PER_RIDER: ${MAX_PER_RIDER}`);
  orders.forEach((o, i) => {
    console.log(`Order ${i+1}: ${o.restaurant.name} @ (${o.restaurant.lat}, ${o.restaurant.lng}) → ${o.customer.name} @ (${o.customer.lat}, ${o.customer.lng})`);
  });

  const assigned = new Set();
  const clusters = [];

  orders.forEach((order, i) => {
    if (assigned.has(i)) return;
    const cluster = [order];
    assigned.add(i);

    orders.forEach((other, j) => {
      if (assigned.has(j) || cluster.length >= MAX_PER_RIDER) return;
      const restDist = kmDist(order.restaurant.lat, order.restaurant.lng, other.restaurant.lat, other.restaurant.lng);
      const custDist = kmDist(order.customer.lat, order.customer.lng, other.customer.lat, other.customer.lng);
      console.log(`  Order ${i+1} vs Order ${j+1}: restDist=${restDist.toFixed(2)}km custDist=${custDist.toFixed(2)}km → ${(restDist <= REST_CLUSTER_KM || custDist <= CUST_CLUSTER_KM) ? 'CLUSTERED ✅' : 'NOT clustered ❌'}`);
      if (restDist <= REST_CLUSTER_KM || custDist <= CUST_CLUSTER_KM) {
        cluster.push(other);
        assigned.add(j);
      }
    });
    clusters.push(cluster);
  });

  console.log(`\nClusters formed: ${clusters.length}`);
  clusters.forEach((c, i) => console.log(`  Cluster ${i+1}: ${c.length} orders`));

  const riderLoad = {};
  deliveryPersons.forEach(r => riderLoad[r.name] = 0);

  const routes = clusters.map((clusterOrders) => {
    const centerLat = clusterOrders.reduce((s, o) => s + o.restaurant.lat, 0) / clusterOrders.length;
    const centerLng = clusterOrders.reduce((s, o) => s + o.restaurant.lng, 0) / clusterOrders.length;

    const sorted = [...deliveryPersons].sort((a, b) =>
      kmDist(a.lat, a.lng, centerLat, centerLng) - kmDist(b.lat, b.lng, centerLat, centerLng)
    );

    const rider =
      sorted.find(r => riderLoad[r.name] + clusterOrders.length <= MAX_PER_RIDER)
      || [...deliveryPersons].sort((a, b) => riderLoad[a.name] - riderLoad[b.name])[0];

    riderLoad[rider.name] += clusterOrders.length;

    const uniqueRests = [...new Set(clusterOrders.map(o => o.restaurant.name))];
    const type =
      uniqueRests.length === 1 && clusterOrders.length === 1 ? 'one_to_one' :
      uniqueRests.length === 1 && clusterOrders.length > 1   ? 'one_to_many' :
      uniqueRests.length > 1  && clusterOrders.length === 1  ? 'many_to_one' :
      'many_to_many';

    return {
      type,
      rider: rider.name,
      restaurants: uniqueRests.join(', '),
      orders: clusterOrders,
      estimatedTime: Math.floor(clusterOrders.length * 7 + Math.random() * 8),
      estimatedDistance: (clusterOrders.length * 1.2 + Math.random() * 1.5).toFixed(1),
      routePoints: clusterOrders.flatMap(o => [
        { ...o.restaurant, type: 'pickup' },
        { ...o.customer, type: 'dropoff' }
      ])
    };
  });

  io.emit('routes_updated', routes);
  res.json(routes);
});

// 6. START SERVER (always last)
server.listen(5500, () => console.log('Server running on port 5500'));