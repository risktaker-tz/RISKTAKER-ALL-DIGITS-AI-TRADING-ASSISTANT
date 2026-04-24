import { createServer } from "http";

import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }
});

io.on("connection", (socket) => {
  socket.on("chat:join", (chatId: string) => {
    socket.join(chatId);
  });

  socket.on("chat:typing", (payload: { chatId: string; userId: string }) => {
    socket.to(payload.chatId).emit("chat:typing", payload);
  });

  socket.on("chat:message", (payload: { chatId: string; message: unknown }) => {
    io.to(payload.chatId).emit("chat:message", payload.message);
  });

  socket.on("call:signal", (payload: { chatId: string; signal: unknown }) => {
    socket.to(payload.chatId).emit("call:signal", payload.signal);
  });
});

httpServer.listen(3001, () => {
  console.log("TUCHATI socket server listening on :3001");
});
