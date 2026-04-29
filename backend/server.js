const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const io = new Server(server, { cors: { origin: "*" } });
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
});

function kmDist(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const isSameRestaurant = (o1, o2) =>
  o1.restaurant.id === o2.restaurant.id ||
  o1.restaurant.name === o2.restaurant.name ||
  kmDist(o1.restaurant.lat, o1.restaurant.lng, o2.restaurant.lat, o2.restaurant.lng) < 0.1;

const isSameCustomer = (o1, o2) =>
  o1.customer.name === o2.customer.name ||
  kmDist(o1.customer.lat, o1.customer.lng, o2.customer.lat, o2.customer.lng) < 0.1;

app.post('/api/orders', (req, res) => {
  const { orders, deliveryPersons } = req.body;
  if (!orders || !orders.length || !deliveryPersons || !deliveryPersons.length) return res.json([]);

  console.log(`\n===== NEW REQUEST: ${orders.length} orders, ${deliveryPersons.length} riders =====`);

  const assigned = new Set();
  const clusters = [];

  orders.forEach((order, i) => {
    if (assigned.has(i)) return;
    const sameRest = orders.map((o, j) => ({ o, j })).filter(({ o, j }) => !assigned.has(j) && j !== i && isSameRestaurant(order, o));
    if (sameRest.length > 0) {
      const group = [order, ...sameRest.map(x => x.o)];
      assigned.add(i);
      sameRest.forEach(x => assigned.add(x.j));
      clusters.push({ orders: group, type: 'one_to_many' });
    }
  });

  orders.forEach((order, i) => {
    if (assigned.has(i)) return;
    const sameCust = orders.map((o, j) => ({ o, j })).filter(({ o, j }) => !assigned.has(j) && j !== i && isSameCustomer(order, o));
    if (sameCust.length > 0) {
      const group = [order, ...sameCust.map(x => x.o)];
      assigned.add(i);
      sameCust.forEach(x => assigned.add(x.j));
      clusters.push({ orders: group, type: 'many_to_one' });
    }
  });

  orders.forEach((order, i) => {
    if (assigned.has(i)) return;
    const nearby = orders.map((o, j) => ({ o, j })).filter(({ o, j }) => {
      if (assigned.has(j) || j === i) return false;
      const restDist = kmDist(order.restaurant.lat, order.restaurant.lng, o.restaurant.lat, o.restaurant.lng);
      const custDist = kmDist(order.customer.lat, order.customer.lng, o.customer.lat, o.customer.lng);
      return restDist < 0.8 && custDist < 0.8;
    });
    if (nearby.length > 0) {
      const group = [order, ...nearby.map(x => x.o)];
      assigned.add(i);
      nearby.forEach(x => assigned.add(x.j));
      clusters.push({ orders: group, type: 'many_to_many' });
    }
  });

  orders.forEach((order, i) => {
    if (assigned.has(i)) return;
    assigned.add(i);
    clusters.push({ orders: [order], type: 'one_to_one' });
  });

  console.log(`Clusters: ${clusters.map(c => `${c.type}(${c.orders.length})`).join(', ')}`);

  const riderLoad = {};
  deliveryPersons.forEach(r => riderLoad[r.id || r.name] = 0);

  const routes = clusters.map((cluster) => {
    const centerLat = cluster.orders.reduce((s, o) => s + o.restaurant.lat, 0) / cluster.orders.length;
    const centerLng = cluster.orders.reduce((s, o) => s + o.restaurant.lng, 0) / cluster.orders.length;

    const sorted = [...deliveryPersons].sort((a, b) => {
      const distA = kmDist(a.lat, a.lng, centerLat, centerLng);
      const distB = kmDist(b.lat, b.lng, centerLat, centerLng);
      const loadA = riderLoad[a.id || a.name];
      const loadB = riderLoad[b.id || b.name];
      return (distA + loadA * 2) - (distB + loadB * 2);
    });

    const rider = sorted[0];
    riderLoad[rider.id || rider.name] += cluster.orders.length;

    const uniqueRests = [...new Set(cluster.orders.map(o => o.restaurant.name))];
    const routePoints = [];
    routePoints.push({ lat: rider.lat, lng: rider.lng, name: rider.name, type: 'rider' });
    cluster.orders.forEach(o => routePoints.push({ ...o.restaurant, type: 'pickup' }));
    cluster.orders.forEach(o => routePoints.push({ ...o.customer, type: 'dropoff' }));

    const totalDist = routePoints.reduce((sum, pt, idx) => {
      if (idx === 0) return sum;
      return sum + kmDist(routePoints[idx-1].lat, routePoints[idx-1].lng, pt.lat, pt.lng);
    }, 0);

    return {
      type: cluster.type,
      rider: rider.name,
      restaurants: uniqueRests.join(', '),
      orders: cluster.orders,
      estimatedTime: Math.round(totalDist / 20 * 60 + cluster.orders.length * 3),
      estimatedDistance: totalDist.toFixed(1),
      routePoints: routePoints.filter(p => p.type !== 'rider'),
    };
  });

  console.log('Routes:', routes.map(r => `${r.rider} → ${r.type}`).join(' | '));
  io.emit('routes_updated', routes);
  res.json(routes);
});

const PORT = process.env.PORT || 5500;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));