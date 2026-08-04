import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: { author: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ data: posts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        author: {
          connectOrCreate: {
            where: { email: body.authorEmail },
            create: { email: body.authorEmail, name: body.authorName }
          }
        }
      }
    });
    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
