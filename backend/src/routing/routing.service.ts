import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoutingService {
  constructor(private prisma: PrismaService) {}

  private async resolveHostId(identifier: string): Promise<{ hostId: string; username: string }> {
    // If identifier is 24 hex characters, check user id first
    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      const user = await this.prisma.user.findUnique({
        where: { id: identifier },
        include: { profile: true },
      });
      if (user) {
        return { hostId: user.id, username: user.profile?.username || user.id };
      }
    }

    // Otherwise check profile username
    const profile = await this.prisma.profile.findUnique({
      where: { username: identifier },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Host not found');
    }

    return { hostId: profile.userId, username: profile.username || identifier };
  }

  async createForm(userId: string, data: any) {
    try {
      return await this.prisma.routingForm.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
          slug: data.slug,
          isActive: data.isActive ?? true,
          fallbackDestination: data.fallbackDestination,
          questions: {
            create: data.questions || []
          },
          rules: {
            create: data.rules || []
          }
        },
        include: { questions: true, rules: true }
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('A form with this slug already exists.');
      }
      throw e;
    }
  }

  async getForms(userId: string) {
    return this.prisma.routingForm.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { questions: true, rules: true }
    });
  }

  async getFormById(id: string, userId: string) {
    const form = await this.prisma.routingForm.findFirst({
      where: { id, userId },
      include: { questions: true, rules: true }
    });
    if (!form) throw new NotFoundException('Routing form not found');
    return form;
  }

  async updateForm(id: string, userId: string, data: any) {
    const form = await this.getFormById(id, userId);

    try {
      return await this.prisma.routingForm.update({
        where: { id: form.id },
        data: {
          title: data.title,
          description: data.description,
          slug: data.slug,
          isActive: data.isActive,
          fallbackDestination: data.fallbackDestination,
          ...(data.questions ? {
            questions: {
              deleteMany: {},
              create: data.questions
            }
          } : {}),
          ...(data.rules ? {
            rules: {
              deleteMany: {},
              create: data.rules
            }
          } : {})
        },
        include: { questions: true, rules: true }
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('A form with this slug already exists.');
      throw e;
    }
  }

  async duplicateForm(id: string, userId: string) {
    const form = await this.getFormById(id, userId);
    const newSlug = `${form.slug}-copy-${Math.random().toString(36).substring(2, 6)}`;
    
    return this.prisma.routingForm.create({
      data: {
        userId,
        title: `${form.title} (Copy)`,
        description: form.description,
        slug: newSlug,
        isActive: form.isActive,
        fallbackDestination: form.fallbackDestination,
        questions: {
          create: form.questions.map((q) => ({
            label: q.label,
            type: q.type,
            options: q.options,
            order: q.order,
            required: q.required,
          })),
        },
        rules: {
          create: form.rules.map((r) => ({
            questionId: r.questionId,
            operator: r.operator,
            value: r.value,
            destination: r.destination,
          })),
        },
      },
      include: { questions: true, rules: true },
    });
  }

  async toggleActive(id: string, userId: string) {
    const form = await this.getFormById(id, userId);
    return this.prisma.routingForm.update({
      where: { id: form.id },
      data: { isActive: !form.isActive },
      include: { questions: true, rules: true },
    });
  }

  async deleteForm(id: string, userId: string) {
    const form = await this.getFormById(id, userId);
    return this.prisma.routingForm.delete({
      where: { id: form.id }
    });
  }

  async getPublicForm(identifier: string, slug: string) {
    const { hostId, username } = await this.resolveHostId(identifier);

    const form = await this.prisma.routingForm.findUnique({
      where: { userId_slug: { userId: hostId, slug } },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            label: true,
            type: true,
            options: true,
            order: true,
            required: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Routing form not found');
    }
    if (!form.isActive) {
      throw new BadRequestException('Routing form is currently inactive');
    }

    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      include: { profile: true },
    });

    return {
      id: form.id,
      title: form.title,
      description: form.description,
      slug: form.slug,
      hostName: host?.profile?.name || username,
      hostUsername: username,
      avatar: host?.profile?.avatar || null,
      questions: form.questions,
    };
  }

  async submitRoutingForm(identifier: string, slug: string, answers: { questionId: string; value: string }[]) {
    const { hostId, username } = await this.resolveHostId(identifier);

    const form = await this.prisma.routingForm.findUnique({
      where: { userId_slug: { userId: hostId, slug } },
      include: { questions: true, rules: true }
    });

    if (!form) {
      throw new NotFoundException('Routing form not found');
    }
    if (!form.isActive) {
      throw new BadRequestException('Routing form is currently inactive');
    }

    // Validate answers
    const answersMap = new Map(answers.map(a => [a.questionId, a.value]));

    for (const q of form.questions) {
      const val = answersMap.get(q.id);
      if (q.required && (!val || val.trim() === '')) {
        throw new BadRequestException(`Missing required answer for question: ${q.label}`);
      }
      if (val && q.options && q.options.length > 0) {
        if (!q.options.includes(val)) {
          throw new BadRequestException(`Invalid option selected for question: ${q.label}`);
        }
      }
    }

    // Evaluate rules in order. First matching rule wins.
    let destination = form.fallbackDestination;

    for (const rule of form.rules) {
      const answerVal = answersMap.get(rule.questionId);
      if (!answerVal) continue;

      let matched = false;
      if (rule.operator === 'EQUALS' && answerVal.toLowerCase() === rule.value.toLowerCase()) {
        matched = true;
      } else if (rule.operator === 'NOT_EQUALS' && answerVal.toLowerCase() !== rule.value.toLowerCase()) {
        matched = true;
      } else if (rule.operator === 'CONTAINS' && answerVal.toLowerCase().includes(rule.value.toLowerCase())) {
        matched = true;
      }

      if (matched) {
        destination = rule.destination;
        break;
      }
    }

    if (!destination) {
      throw new BadRequestException('No matching route found and no fallback destination provided.');
    }

    // Verify destination exists and is active
    if (destination.startsWith('http://') || destination.startsWith('https://')) {
      return { destination, isExternal: true, username };
    }

    const targetEventType = await this.prisma.eventType.findUnique({
      where: { userId_slug: { userId: hostId, slug: destination } }
    });

    if (!targetEventType || !targetEventType.isActive) {
      if (destination !== 'profile') {
        throw new BadRequestException('The routed destination event is unavailable or inactive.');
      }
    }

    return { destination, username, isExternal: false };
  }
}
