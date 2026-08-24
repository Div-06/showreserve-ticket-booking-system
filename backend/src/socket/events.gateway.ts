import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface SeatStatusUpdateEvent {
  showId: string;
  seatIds: string[];
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  holdExpiresAt?: string | null;
  heldByUserId?: string | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket: ${client.id}`);
  }

  @SubscribeMessage('join:show')
  handleJoinShow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { showId: string },
  ) {
    if (data?.showId) {
      const room = `show:${data.showId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined room ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('leave:show')
  handleLeaveShow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { showId: string },
  ) {
    if (data?.showId) {
      const room = `show:${data.showId}`;
      client.leave(room);
      this.logger.log(`Socket ${client.id} left room ${room}`);
      return { status: 'left', room };
    }
  }

  /**
   * Broadcast real-time seat status updates to all clients in the show room.
   */
  broadcastSeatUpdate(event: SeatStatusUpdateEvent) {
    const room = `show:${event.showId}`;
    if (this.server) {
      this.server.to(room).emit('seat:status_changed', event);
      this.logger.log(`Broadcasted seat:status_changed to ${room}: ${event.seatIds.length} seat(s) -> ${event.status}`);
    }
  }
}
