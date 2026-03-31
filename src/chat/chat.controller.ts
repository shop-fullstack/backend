import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('chat')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() dto: ChatRequestDto) {
    return this.chatService.chat(dto.message, {
      business_type: dto.context?.business_type || '',
      cart_count: dto.context?.cart_count || 0,
    });
  }
}
