"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SlackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let SlackService = SlackService_1 = class SlackService {
    prisma;
    logger = new common_1.Logger(SlackService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendBookingNotification(hostId, guestName, guestEmail, startTime, eventTitle) {
        try {
            const integration = await this.prisma.integration.findUnique({
                where: {
                    userId_provider: {
                        userId: hostId,
                        provider: 'slack'
                    }
                }
            });
            if (!integration) {
                this.logger.log(`No Slack integration found for host ${hostId}. Skipping notification.`);
                return;
            }
            const webhookUrl = integration.accessToken;
            if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
                this.logger.warn(`Invalid Slack webhook URL for host ${hostId}.`);
                return;
            }
            const dateStr = new Date(startTime).toLocaleString();
            const message = {
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🎉 New Meeting Booked!",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        fields: [
                            {
                                type: "mrkdwn",
                                text: `*Event:*\n${eventTitle}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*When:*\n${dateStr}`
                            }
                        ]
                    },
                    {
                        type: "section",
                        fields: [
                            {
                                type: "mrkdwn",
                                text: `*Guest:*\n${guestName}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*Email:*\n${guestEmail}`
                            }
                        ]
                    }
                ]
            };
            await axios_1.default.post(webhookUrl, message);
            this.logger.log(`[SLACK] Sent booking notification for host ${hostId}`);
        }
        catch (error) {
            this.logger.error(`[SLACK] Failed to send notification: ${error.message}`);
        }
    }
    async sendCancellationNotification(hostId, guestName, eventTitle, reason) {
        try {
            const integration = await this.prisma.integration.findUnique({
                where: { userId_provider: { userId: hostId, provider: 'slack' } }
            });
            if (!integration || !integration.accessToken.startsWith('https://hooks.slack.com/'))
                return;
            const message = {
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: "❌ Meeting Canceled", emoji: true }
                    },
                    {
                        type: "section",
                        text: { type: "mrkdwn", text: `The meeting *${eventTitle}* with *${guestName}* has been canceled.` }
                    },
                    {
                        type: "context",
                        elements: [{ type: "mrkdwn", text: `*Reason:* ${reason}` }]
                    }
                ]
            };
            await axios_1.default.post(integration.accessToken, message);
            this.logger.log(`[SLACK] Sent cancellation notification for host ${hostId}`);
        }
        catch (error) {
            this.logger.error(`[SLACK] Failed to send cancellation: ${error.message}`);
        }
    }
};
exports.SlackService = SlackService;
exports.SlackService = SlackService = SlackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SlackService);
//# sourceMappingURL=slack.service.js.map