import { Controller, Get, Param, Post, Body, Put, Delete } from '@nestjs/common';
import { Post as PostModel } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('post/:id')
  async getPostById(@Param('id') id: string): Promise<{ message: string; data?: PostModel; error?: string }> {
    try {
      const data = await this.prismaService.post.findUnique({ where: { id: Number(id) } });
      return { message: 'success', data };
    } catch (err) {
      return { message: 'error', error: err.message };
    }
  }

  @Get('post')
  async getAllPosts(): Promise<{ message: string; data?: PostModel[]; error?: string }> {
    try {
      const data = await this.prismaService.post.findMany();
      return { message: 'success', data };
    } catch (err) {
      return { message: 'error', error: err.message };
    }
  }

  @Post('post')
  async createPost(
    @Body() postData: { title: string; content: string; authorEmail: string }
  ): Promise<{ message: string; data?: PostModel; error?: string }> {
    try {
      const data = await this.prismaService.post.create({ data: postData });
      return { message: 'success', data };
    } catch (err) {
      return { message: 'error', error: err.message };
    }
  }

  @Put('post/:id')
  async updatePost(
    @Param('id') id: string,
    @Body() postData: { title?: string; content?: string; authorEmail?: string }
  ): Promise<{ message: string; data?: PostModel; error?: string }> {
    try {
      const { createdAt, updatedAt, ...existingPostData } = await this.prismaService.post.findUnique({
        where: { id: Number(id) },
      });

      const data = await this.prismaService.post.update({
        data: { ...existingPostData, ...postData },
        where: { id: Number(id) },
      });
      return { message: 'success', data };
    } catch (err) {
      return { message: 'error', error: err.message };
    }
  }

  @Delete('post/:id')
  async deletePost(@Param('id') id: string): Promise<{ message: string; data?: PostModel; error?: string }> {
    try {
      const data = await this.prismaService.post.delete({ where: { id: Number(id) } });
      return { message: 'success', data };
    } catch (err) {
      return { message: 'error', error: err.message };
    }
  }
}
