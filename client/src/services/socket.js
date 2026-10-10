import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
  auth: (cb) => {
    cb({ token: localStorage.getItem('prohori_token') || '' });
  },
});

export const connectSocket = (token) => {
  const currentToken = token || localStorage.getItem('prohori_token');
  if (!currentToken) {
    if (socket.connected) socket.disconnect();
    return;
  }
  if (socket.connected) {
    if (socket.auth?.token === currentToken) {
      return;
    }
    socket.auth = { token: currentToken };
    socket.disconnect().connect();
  } else {
    socket.auth = { token: currentToken };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
