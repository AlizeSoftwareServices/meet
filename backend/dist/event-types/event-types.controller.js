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
exports.EventTypesController = void 0;
const common_1 = require("@nestjs/common");
const event_types_service_1 = require("./event-types.service");
const create_event_type_dto_1 = require("./dto/create-event-type.dto");
const update_event_type_dto_1 = require("./dto/update-event-type.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let EventTypesController = class EventTypesController {
    eventTypesService;
    constructor(eventTypesService) {
        this.eventTypesService = eventTypesService;
    }
    create(req, createEventTypeDto) {
        return this.eventTypesService.create(req.user.userId, createEventTypeDto);
    }
    findAll(req) {
        return this.eventTypesService.findAllForUser(req.user.userId);
    }
    findOne(req, id) {
        return this.eventTypesService.findOne(id, req.user.userId);
    }
    findBySlug(hostId, slug) {
        return this.eventTypesService.findBySlugAndHost(slug, hostId);
    }
    update(req, id, updateEventTypeDto) {
        return this.eventTypesService.update(id, req.user.userId, updateEventTypeDto);
    }
    remove(req, id) {
        return this.eventTypesService.remove(id, req.user.userId);
    }
};
exports.EventTypesController = EventTypesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_event_type_dto_1.CreateEventTypeDto]),
    __metadata("design:returntype", void 0)
], EventTypesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventTypesController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EventTypesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('public/:hostId/:slug'),
    __param(0, (0, common_1.Param)('hostId')),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EventTypesController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_event_type_dto_1.UpdateEventTypeDto]),
    __metadata("design:returntype", void 0)
], EventTypesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EventTypesController.prototype, "remove", null);
exports.EventTypesController = EventTypesController = __decorate([
    (0, common_1.Controller)('event-types'),
    __metadata("design:paramtypes", [event_types_service_1.EventTypesService])
], EventTypesController);
//# sourceMappingURL=event-types.controller.js.map