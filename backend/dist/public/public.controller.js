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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const public_service_1 = require("./public.service");
const bookings_service_1 = require("../bookings/bookings.service");
const create_booking_dto_1 = require("../bookings/dto/create-booking.dto");
let PublicController = class PublicController {
    publicService;
    bookingsService;
    constructor(publicService, bookingsService) {
        this.publicService = publicService;
        this.bookingsService = bookingsService;
    }
    async getUserProfile(username) {
        return this.publicService.getUserProfile(username);
    }
    async getAvailableSlots(username, eventSlug, date, timezone) {
        if (!date) {
            throw new common_1.BadRequestException('Date query parameter is required (YYYY-MM-DD)');
        }
        return this.publicService.getAvailableSlots(username, eventSlug, date, timezone);
    }
    async createBooking(dto) {
        return this.bookingsService.createBooking(dto);
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)('users/:username'),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getUserProfile", null);
__decorate([
    (0, common_1.Get)('availability/:username/:eventSlug/slots'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Param)('eventSlug')),
    __param(2, (0, common_1.Query)('date')),
    __param(3, (0, common_1.Query)('timezone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Post)('bookings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_dto_1.CreateBookingDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "createBooking", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [public_service_1.PublicService,
        bookings_service_1.BookingsService])
], PublicController);
//# sourceMappingURL=public.controller.js.map